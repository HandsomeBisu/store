// Firebase 앱을 초기화하고 필요한 서비스를 가져옵니다.
// 이 파일은 다른 스크립트에서 Firebase 기능을 사용하기 전에 먼저 로드되어야 합니다.

// Firebase SDK 스크립트는 HTML 파일에서 직접 import 됩니다.

// Firebase 구성 정보: 이 정보는 Firebase 프로젝트 설정에서 가져옵니다.
const firebaseConfig = {
    apiKey: "AIzaSyCwpWBNTjc-0K4-6lvbmcpKYO3EAfdFMHg",
    authDomain: "store-dps.firebaseapp.com",
    projectId: "store-dps",
    storageBucket: "store-dps.appspot.com",
    messagingSenderId: "706928532499",
    appId: "1:706928532499:web:665dcc5b9c39d3dc9473e6"
  };

// Firebase 앱 초기화
const app = firebase.initializeApp(firebaseConfig);

// Firebase 서비스 변수 내보내기 (다른 모듈에서 사용할 수 있도록)
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
