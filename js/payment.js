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
    const summaryTotalEl = document.getElementById('summaryTotal');

    // "바로 구매" 상품 확인
    const buyNowItem = JSON.parse(sessionStorage.getItem('buyNowItem'));

    let itemsToPay = [];
    let isBuyNow = false;

    if (buyNowItem) {
        itemsToPay.push(buyNowItem);
        isBuyNow = true;
        sessionStorage.removeItem('buyNowItem'); 
    } else {
        itemsToPay = JSON.parse(localStorage.getItem('cart')) || [];
    }

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

    function renderPaymentDetails() {
        if (itemsToPay.length === 0) {
            productSliderWrapper.innerHTML = '<p>주문할 상품이 없습니다.</p>';
            summaryItemsContainer.innerHTML = '<p>주문할 상품이 없습니다.</p>';
            totalAmountEl.textContent = formatNumber(0);
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
                            <div class="muted-small">예상 발송 2-3일</div>
                        </div>
                        <div style="text-align:right;color:var(--muted);font-size:13px">주문번호 <br><strong>#DPS-${Date.now().toString().slice(-7)}</strong></div>
                    </div>
                </div>
            </div>
        `).join('');

                totalPaymentAmount = itemsToPay.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const shippingFee = 3000;
                totalPaymentAmount += shippingFee;
        
                // 주문 요약 (우측)
                let summaryHtml = itemsToPay.map(item => `
                    <div class="summary-row"><span>${item.name} x ${item.quantity}</span><span>₩ ${formatNumber(item.price * item.quantity)}</span></div>
                `).join('');
                summaryHtml += `<div class="summary-row"><span>배송비</span><span>₩ ${formatNumber(shippingFee)}</span></div>`;
                summaryItemsContainer.innerHTML = summaryHtml;        totalAmountEl.textContent = formatNumber(totalPaymentAmount);
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
      iPaidBtn.textContent = '확인중...';
      iPaidBtn.disabled = true;

      setTimeout(()=>{
        // 성공 모달 대신 간단한 alert + 요약
        const summary = `입금 접수되었습니다.\n입금자: ${payer}\n연락처: ${phone}\n입금계좌: ${currentAccount.bank} ${currentAccount.number}\n금액: ₩${formatNumber(totalPaymentAmount)}\n메모: ${memo || '-'}`;
        alert(summary + '\n\n관리자 확인 후 주문이 확정됩니다.');
        iPaidBtn.textContent = '입금 완료 등록';
        iPaidBtn.disabled = false;

        // 바로 구매가 아닌 경우에만 장바구니 비우기
        if (!isBuyNow) {
            localStorage.removeItem('cart');
        }
        window.location.href = 'index.html';

      }, 1200);
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