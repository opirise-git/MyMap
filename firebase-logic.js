// Firebase 최신 모듈 단일 임포트
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// 전역(window) 객체에 할당하여 HTML의 onclick 이벤트에서 접근 가능하도록 함
window.db = db;
window.collection = collection;
window.addDoc = addDoc;

console.log("🔥 Firebase 로직 분리 완료 및 연결 성공!");

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
        alert(`DB에 [${goalId}] 목표에 대한 ${val} 기록이 추가되었습니다!`);
        document.getElementById(inputId).value = '';
    } catch (e) {
        console.error("Error adding progress: ", e);
    }
}
