import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// 데이터를 임시 저장할 메모리
let goalsData = [];
let progressData = {}; // { goalId: 누적퍼센트 }

/* ==========================================
   실시간 데이터 구독 및 화면 렌더링 (데이터 주도형)
   ========================================== */
const qGoals = query(collection(db, "goals"), orderBy("createdAt", "desc"));

// 1. 목표 데이터 리스너
onSnapshot(qGoals, (snapshot) => {
    goalsData = [];
    snapshot.forEach((doc) => {
        goalsData.push({ id: doc.id, ...doc.data() });
    });
    renderDashboard();
});

// 2. 진척도(Progress) 데이터 리스너
onSnapshot(collection(db, "progress"), (snapshot) => {
    progressData = {};
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (!progressData[data.goalId]) progressData[data.goalId] = 0;
        progressData[data.goalId] += data.percentageAdded;
    });
    renderDashboard();
});

// 3. UI 동적 렌더링 함수
function renderDashboard() {
    const container = document.getElementById('goals-container');
    container.innerHTML = ''; // 기존 뷰 초기화

    let totalGlobalProgress = 0;

    goalsData.forEach(goal => {
        // 해당 목표의 누적 진척도 (0 ~ 100 제한)
        let currentProgress = progressData[goal.id] || 0;
        currentProgress = Math.min(currentProgress, 100); 
        totalGlobalProgress += currentProgress;

        // D-Day 계산
        const deadlineDate = goal.deadline ? goal.deadline.toDate() : new Date();
        const diffTime = deadlineDate - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const ddayText = diffDays > 0 ? `D-${diffDays}` : (diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)}`);

        // 카드 UI 컴포넌트 생성 (템플릿 리터럴)
        const cardHtml = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center">
                        <div class="bg-blue-50 text-blue-600 p-3 rounded-lg mr-4"><i class="fa-solid fa-bullseye text-xl"></i></div>
                        <div>
                            <h3 class="font-bold text-lg text-gray-900">${goal.title}</h3>
                            <p class="text-xs text-gray-500 mt-1">${ddayText} · ${goal.durationDays}일 계획</p>
                        </div>
                    </div>
                </div>
                
                <div class="mb-2 flex justify-between text-sm">
                    <span class="font-medium text-gray-700">진행률</span>
                    <span class="text-blue-600 font-bold">${currentProgress}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden relative">
                    <div class="progress-bar-fill bg-blue-500 h-2.5 rounded-full" style="width: ${currentProgress}%"></div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span class="text-sm text-gray-600 font-medium">진척도 추가 (%)</span>
                    <div class="flex items-center space-x-2">
                        <input type="number" id="input-${goal.id}" placeholder="+ (퍼센트)" class="w-24 text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5 border">
                        <button onclick="addProgressPercent('${goal.id}', 'input-${goal.id}')" class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">기록</button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });

    // 로드맵 전체 평균 게이지 업데이트
    if(goalsData.length > 0) {
        let avgProgress = totalGlobalProgress / goalsData.length;
        document.getElementById('bar-roadmap-main').style.height = `${avgProgress}%`;
    }
}

/* ==========================================
   목표 생성 및 진행 기록 저장 로직
   ========================================== */
// 퍼센트 기록 추가 (0~100)
window.addProgressPercent = async function(goalId, inputId) {
    const val = Number(document.getElementById(inputId).value);
    if(!val || val <= 0) return;

    try {
        await addDoc(collection(db, "progress"), {
            goalId: goalId,  // 매칭키
            percentageAdded: val, // 추가할 퍼센트 값
            timestamp: new Date()
        });
        document.getElementById(inputId).value = ''; 
    } catch (e) {
        console.error("Error adding progress: ", e);
    }
}

// 새 목표 DB 저장
window.saveNewGoal = async function() {
    const title = document.getElementById('goalTitle').value;
    const days = parseInt(document.getElementById('selectedDays').value);

    if(!title || isNaN(days)) {
        document.getElementById('durationError').classList.remove('hidden');
        return;
    }

    // 마감일(Deadline) 계산
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    try {
        // docId를 직접 짓지 않고 addDoc을 쓰면 Firebase가 고유 ID를 부여합니다.
        await addDoc(collection(db, "goals"), {
            title: title,
            durationDays: days,
            createdAt: new Date(),
            deadline: deadline
        });
        closeModal();
    } catch (e) {
        console.error("Error saving new goal: ", e);
    }
}

/* ==========================================
   UI 컨트롤 (모달 및 버튼)
   ========================================== */
const modal = document.getElementById('goalModal');
const body = document.body;

window.openNewGoalModal = function() {
    // 입력폼 초기화
    document.getElementById('newGoalForm').reset();
    document.getElementById('selectedDays').value = '';
    document.getElementById('durationError').classList.add('hidden');
    
    // 버튼 스타일 초기화
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('border-gray-300', 'text-gray-600');
    });

    modal.classList.remove('opacity-0', 'pointer-events-none');
    body.classList.add('modal-active');
}

window.closeModal = function() {
    modal.classList.add('opacity-0', 'pointer-events-none');
    body.classList.remove('modal-active');
}

window.selectDuration = function(days, btnElement) {
    document.getElementById('selectedDays').value = days;
    document.getElementById('durationError').classList.add('hidden');
    
    // 모든 버튼 색상 리셋
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('border-gray-300', 'text-gray-600');
    });
    
    // 선택된 버튼 하이라이트
    btnElement.classList.remove('border-gray-300', 'text-gray-600');
    btnElement.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
}
