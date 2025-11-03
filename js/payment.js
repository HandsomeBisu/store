import { db, auth } from './firebase.js';
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- 초기 데이터 ---
    const DEFAULT_ACCOUNT = { bank: '국민은행', number: '6336-9074-6980-34', holder: '조승우' };
    const ALT_ACCOUNT = { bank: '우리은행', number: '987-6543-210987', holder: '디피에스(주)' };
    let currentAccount = DEFAULT_ACCOUNT;

    // DOM
    const productSliderWrapper = document.getElementById('payment-product-summary');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const summaryItemsContainer = document.getElementById('summary-items-container');
    const accountNumberEl = document.getElementById('accountNumber');
    const accountBankEl = document.getElementById('accountBank');
    const copyBtn = document.getElementById('copyBtn');

    const bankButtons = document.querySelectorAll('.bank-select');
    const countdownEl = document.getElementById('countdown');
    const iPaidBtn = document.getElementById('iPaidBtn');
    const payerInput = document.getElementById('payer');
    const phoneInput = document.getElementById('phone');
    const memoInput = document.getElementById('memo');

    // 금액
    const totalAmountEl = document.getElementById('totalAmount');
    const summarySubtotalEl = document.getElementById('summarySubtotal');
    const summaryDiscountEl = document.getElementById('summaryDiscount');
    const summaryTotalEl = document.getElementById('summaryTotal');

    // 쿠폰 관련 DOM
    const couponInput = document.getElementById('coupon-input');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponStatus = document.getElementById('coupon-status');

    // "바로 구매" 상품 확인
    const buyNowItem = JSON.parse(sessionStorage.getItem('buyNowItem'));

    let itemsToPay = [];
    let isBuyNow = false;
    let discountAmount = 0;

    if (buyNowItem) {
        itemsToPay.push(buyNowItem);
        isBuyNow = true;
        sessionStorage.removeItem('buyNowItem'); 
    } else {
        itemsToPay = JSON.parse(localStorage.getItem('cart')) || [];
    }

    let subtotalAmount = 0;
    let totalPaymentAmount = 0;
    let currentSlideIndex = 0;

    function formatNumber(n){return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");}

    function showSlide(index) {
        if (itemsToPay.length === 0) return;
        if (index >= itemsToPay.length) {
            currentSlideIndex = 0;
        } else if (index < 0) {
            currentSlideIndex = itemsToPay.length - 1;
        }
        productSliderWrapper.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }

    async function calculateShippingFee(items) {
        if (items.length === 0) {
            return 0;
        }

        let hasNonExemptItem = false;
        for (const item of items) {
            const productRef = doc(db, 'products', item.id);
            try {
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    const productData = productSnap.data();
                    if (!productData.shippingFeeExempt) {
                        hasNonExemptItem = true;
                        break; // 하나라도 비면제 상품이 있으면 더 이상 확인할 필요 없음
                    }
                }
            } catch (error) {
                console.error("상품 정보를 가져오는 중 오류 발생:", error);
                // 오류 발생 시 기본적으로 배송비 부과
                return 3000;
            }
        }

        return hasNonExemptItem ? 3000 : 0;
    }

    async function renderPaymentDetails() {
        if (itemsToPay.length === 0) {
            productSliderWrapper.innerHTML = '<p>주문할 상품이 없습니다.</p>';
            summaryItemsContainer.innerHTML = '<p>주문할 상품이 없습니다.</p>';
            totalAmountEl.textContent = formatNumber(0);
            summarySubtotalEl.textContent = formatNumber(0);
            summaryDiscountEl.textContent = formatNumber(0);
            summaryTotalEl.textContent = formatNumber(0);
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            return;
        }

        // 상품 요약 (좌측) - 슬라이드 형태로 렌더링
        productSliderWrapper.innerHTML = itemsToPay.map(item => `
            <div class="product-slide">
                <div class="thumb"><img src="${item.image}" alt="${item.name}"></div>
                <div class="prod-info">
                    <div class="prod-title">${item.name}</div>
                    <div class="prod-sub">사이즈: ${item.size} · 색상: ${item.color}</div>
                    <div style="display:flex;gap:12px;align-items:end;justify-content:space-between">
                        <div>
                            <div class="price">₩ ${formatNumber(item.price * item.quantity)}</div>
                            <div class="muted-small">예상 발송 7-14일</div>
                        </div>
                        <div style="text-align:right;color:var(--muted);font-size:13px">주문번호 <br><strong>#DPS-${Date.now().toString().slice(-7)}</strong></div>
                    </div>
                </div>
            </div>
        `).join('');

        subtotalAmount = itemsToPay.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = await calculateShippingFee(itemsToPay);
        totalPaymentAmount = subtotalAmount + shippingFee - discountAmount;
        if (totalPaymentAmount < 0) totalPaymentAmount = 0; // Ensure total doesn't go negative
        
        // 주문 요약 (우측)
        let summaryHtml = itemsToPay.map(item => `
            <div class="summary-row"><span>${item.name} x ${item.quantity}</span><span>₩ ${formatNumber(item.price * item.quantity)}</span></div>
        `).join('');
        summaryHtml += `<div class="summary-row"><span>배송비</span><span>₩ ${formatNumber(shippingFee)}</span></div>`;
        summaryItemsContainer.innerHTML = summaryHtml;

        summarySubtotalEl.textContent = formatNumber(subtotalAmount);
        summaryDiscountEl.textContent = formatNumber(discountAmount);
        totalAmountEl.textContent = formatNumber(totalPaymentAmount);
        summaryTotalEl.textContent = formatNumber(totalPaymentAmount);

        if (itemsToPay.length > 1) {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
        showSlide(currentSlideIndex);
    }

    // 슬라이더 버튼 이벤트 리스너
    prevBtn.addEventListener('click', () => {
        currentSlideIndex--;
        showSlide(currentSlideIndex);
    });

    nextBtn.addEventListener('click', () => {
        currentSlideIndex++;
        showSlide(currentSlideIndex);
    });

    function renderAccount(){
      accountNumberEl.textContent = currentAccount.number;
      accountBankEl.textContent = `${currentAccount.bank} • 예금주: ${currentAccount.holder}`;
    }

    renderAccount();

    // 복사
    copyBtn.addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(currentAccount.number);
        copyBtn.textContent = '복사됨';
        setTimeout(()=>copyBtn.textContent = '계좌복사',1500);
      }catch(e){
        alert('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
      }
    });



    // 은행 선택 버튼 (UI용)
    bankButtons.forEach(btn=>{
      btn.addEventListener('click',()=>{
        bankButtons.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        // 살짝 애니메이션 효과
        btn.style.borderColor = 'rgba(43,110,246,0.15)';
        setTimeout(()=>btn.style.borderColor = '',400);
      })
    })

    // 쿠폰 적용 로직
    applyCouponBtn.addEventListener('click', async () => {
        const code = couponInput.value.trim();
        if (!code) {
            couponStatus.textContent = '쿠폰 코드를 입력해주세요.';
            couponStatus.style.color = '#e74c3c';
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            couponStatus.textContent = '로그인 후 쿠폰을 사용해주세요.';
            couponStatus.style.color = '#e74c3c';
            return;
        }

        try {
            const q = query(collection(db, 'coupons'), where('code', '==', code));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                couponStatus.textContent = '유효하지 않은 쿠폰 코드입니다.';
                couponStatus.style.color = '#e74c3c';
                return;
            }

            const couponDoc = querySnapshot.docs[0];
            const coupon = { id: couponDoc.id, ...couponDoc.data() };

            if (coupon.quantity <= 0) {
                couponStatus.textContent = '쿠폰이 모두 소진되었습니다.';
                couponStatus.style.color = '#e74c3c';
                return;
            }

            const couponUsageRef = doc(db, 'couponUsage', `${user.uid}_${coupon.id}`);
            const couponUsageSnap = await getDoc(couponUsageRef);

            if (couponUsageSnap.exists()) {
                couponStatus.textContent = '이미 사용한 쿠폰입니다.';
                couponStatus.style.color = '#e74c3c';
                return;
            }

            const discountPercentage = coupon.discountPercentage;
            discountAmount = subtotalAmount * (discountPercentage / 100);
            
            await updateDoc(doc(db, 'coupons', coupon.id), {
                quantity: coupon.quantity - 1
            });

            await setDoc(couponUsageRef, {
                userId: user.uid,
                couponId: coupon.id,
                usedAt: serverTimestamp()
            });

            couponStatus.textContent = `${discountPercentage}% 할인 적용! (₩ ${formatNumber(discountAmount)})`;
            couponStatus.style.color = '#27ae60';
            renderPaymentDetails(); // Recalculate and render totals

        } catch (error) {
            console.error('쿠폰 적용 중 오류 발생:', error);
            couponStatus.textContent = '쿠폰 적용 중 오류가 발생했습니다.';
            couponStatus.style.color = '#e74c3c';
            discountAmount = 0;
            renderPaymentDetails();
        }
    });

    // 카운트다운 (예: 24시간 유효 -> 여기선 12시간 예시)
    const EXPIRATION_MS = 1000 * 60 * 60 * 12; // 12시간
    const endTime = Date.now() + EXPIRATION_MS;
    function tick(){
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      const h = Math.floor(diff / (1000*60*60));
      const m = Math.floor((diff % (1000*60*60)) / (1000*60));
      const s = Math.floor((diff % (1000*60)) / 1000);
      countdownEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if(diff<=0){
        clearInterval(timerInterval);
        countdownEl.textContent = '만료됨';
        iPaidBtn.disabled = true;
        iPaidBtn.textContent = '입금기간 만료';
        iPaidBtn.style.opacity = 0.6;
      }
    }
    const timerInterval = setInterval(tick, 1000);
    tick();

    // 입금 완료 처리 (프론트 단에서 시연)
    iPaidBtn.addEventListener('click', ()=>{
      const payer = payerInput.value.trim();
      const phone = phoneInput.value.trim();
      const memo = memoInput.value.trim();

      if(!payer){
        alert('입금자명을 입력해주세요.');
        payerInput.focus();
        return;
      }

      if(!phone){
        alert('연락처를 입력해주세요.');
        phoneInput.focus();
        return;
      }

      // 시뮬레이션: 서버에 전송된다고 가정
      iPaidBtn.textContent = '처리 중...';
      iPaidBtn.disabled = true;

      // Firestore에 주문 데이터 저장
      const orderRef = doc(collection(db, 'orders'), `DPS-${Date.now().toString()}`);
      const orderData = {
        payer: payer,
        phone: phone,
        memo: memo,
        items: itemsToPay,
        subtotal: subtotalAmount,
        discount: discountAmount,
        total: totalPaymentAmount,
        status: '입금확인', // 'pending', 'confirmed', 'shipped', 'delivered'
        createdAt: serverTimestamp(),
        userId: auth.currentUser ? auth.currentUser.uid : null // 현재 로그인한 사용자 ID 추가
      };

      setDoc(orderRef, orderData)
        .then(() => {
          console.log('Order successfully written!');
          // 바로 구매가 아닌 경우에만 장바구니 비우기
          if (!isBuyNow) {
              localStorage.removeItem('cart');
          }
          window.location.href = 'order-confirmation.html';
        })
        .catch((error) => {
          console.error('Error writing order: ', error);
          alert('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
          iPaidBtn.textContent = '결제 완료';
          iPaidBtn.disabled = false;
        });
    });

    // 주문 취소
    document.getElementById('cancelBtn').addEventListener('click', ()=>{
      if(confirm('주문을 취소하시겠습니까?')){
        // 리셋(간단히)
        payerInput.value = '';
        phoneInput.value = '';
        memoInput.value = '';
        alert('주문이 취소되었습니다.');
        window.location.href = 'index.html';
      }
    });

    renderPaymentDetails();
});