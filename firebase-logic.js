// Firebase 최신 모듈 임포트 (onSnapshot 추가됨)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDM9QGDX-EA_gGVZVE3aepmxq7LsGqlbok",
    authDomain: "myliferoadmap-a9632.firebaseapp.com",
    projectId: "myliferoadmap-a9632",
    storageBucket: "myliferoadmap-a9632.firebasestorage.app",
    messagingSenderId: "50145529212",
    appId: "1:50145529212:web:37c358e1b1d9e207f8a8f9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;
window.collection = collection;
window.addDoc = addDoc;

/* ==========================================
   실시간 UI 렌더링 로직 (🔥 핵심 추가 부분)
   ========================================== */
// 목표 수치(타겟) 하드코딩 - 나중에는 이 값도 DB(Goals 컬렉션)에서 가져오면 완벽해집니다.
const TARGET_READ = 3;  
const TARGET_WALK = 100; 

// progress 컬렉션에 실시간 리스너 장착
onSnapshot(collection(db, "progress"), (snapshot) => {
    let readSum = 0;
    let walkSum = 0;

    // 1. DB의 모든 데이터를 돌면서 goalId별로 누적 합산을 구함
    snapshot.forEach((doc) => {
        const data = doc.data();
        if(data.goalId === 'goal_read_001') readSum += data.valueToAdd;
        if(data.goalId === 'goal_walk_002') walkSum += data.valueToAdd;
    });

    // 자바스크립트의 소수점 오류 방지 (예: 2.2000000001)
    readSum = Math.round(readSum * 10) / 10;
    walkSum = Math.round(walkSum * 10) / 10;

    // 2. 퍼센트 계산 (100%를 넘지 않도록 처리)
    let readPercent = Math.min((readSum / TARGET_READ) * 100, 100);
    let walkPercent = Math.min((walkSum / TARGET_WALK) * 100, 100);

    // 3. UI 업데이트 (HTML ID로 찾아가서 텍스트와 게이지 바 길이 수정)
    // 독서 카드
    document.getElementById('text-read-current').innerText = `${readSum}권`;
    document.getElementById('bar-read').style.width = `${readPercent}%`;

    // 걷기 카드
    document.getElementById('text-walk-current').innerText = `${walkSum}km`;
    document.getElementById('bar-walk').style.width = `${walkPercent}%`;

    // 오른쪽 마일스톤 로드맵 카드 업데이트
    document.getElementById('text-roadmap-read').innerText = `현재 ${readSum} / 2권`; // 마일스톤 노드 텍스트
    
    // 로드맵 전체 세로 줄 진행률 (단순히 두 목표의 평균 진행률로 시뮬레이션)
    let totalPercent = (readPercent + walkPercent) / 2;
    document.getElementById('bar-roadmap-main').style.height = `${totalPercent}%`;
});


/* ==========================================
   UI 제어 모달 로직 
   ========================================== */
const modal = document.getElementById('goalModal');
const body = document.body;
let currentEditingGoalId = null;

window.openEditModal = function(goalId) {
    currentEditingGoalId = goalId;
    document.getElementById('displayGoalId').value = goalId;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    body.classList.add('modal-active');
}

window.openGoalModal = function() {
    openEditModal('new_goal');
}

window.closeModal = function() {
    currentEditingGoalId = null;
    modal.classList.add('opacity-0', 'pointer-events-none');
    body.classList.remove('modal-active');
}

/* ==========================================
   데이터 DB 전송 로직
   ========================================== */
window.saveModification = async function() {
    const reason = document.getElementById('changeReason').value;
    const newTarget = document.getElementById('newTarget').value;
    
    if(!reason) {
        alert('수정 사유를 반드시 입력해야 합니다.');
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "revisions"), {
            goalId: currentEditingGoalId,
            newTarget: Number(newTarget),
            reason: reason,
            timestamp: new Date()
        });
        alert(`DB에 [${currentEditingGoalId}] 목표 수정 내역이 기록되었습니다!`);
        closeModal();
        document.getElementById('changeReason').value = '';
    } catch (e) {
        console.error("Error adding document: ", e);
        alert('저장에 실패했습니다.');
    }
}

window.addProgress = async function(goalId, inputId) {
    const val = document.getElementById(inputId).value;
    if(!val) return;

    try {
        await addDoc(collection(db, "progress"), {
            goalId: goalId,
            valueToAdd: Number(val),
            timestamp: new Date()
        });
        // alert() 창은 UX의 흐름을 깰 수 있어, 게이지가 오르는 시각 효과만 남기기 위해 생략했습니다.
        document.getElementById(inputId).value = ''; 
    } catch (e) {
        console.error("Error adding progress: ", e);
    }
}
