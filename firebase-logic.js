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

let goalsData = [];
let rawProgressLogs = [];

/* ==========================================
   실시간 데이터 구독
   ========================================== */
const qGoals = query(collection(db, "goals"), orderBy("createdAt", "desc"));
const qProgress = query(collection(db, "progress"), orderBy("timestamp", "asc"));

onSnapshot(qGoals, (snapshot) => {
    goalsData = [];
    snapshot.forEach((doc) => goalsData.push({ id: doc.id, ...doc.data() }));
    renderDashboard();
});

onSnapshot(qProgress, (snapshot) => {
    rawProgressLogs = [];
    snapshot.forEach((doc) => rawProgressLogs.push(doc.data()));
    renderDashboard();
});

/* ==========================================
   [카드 GUI] 동적 렌더링 함수
   ========================================== */
function renderDashboard() {
    const container = document.getElementById('goals-container');
    container.innerHTML = '';

    goalsData.forEach(goal => {
        let currentProgress = 0;
        const goalLogs = rawProgressLogs.filter(log => log.goalId === goal.id);

        if (goalLogs.length > 0) {
            if (goal.updateType === 'set') {
                currentProgress = goalLogs[goalLogs.length - 1].value;
            } else {
                currentProgress = goalLogs.reduce((sum, log) => sum + log.value, 0);
            }
        }
        
        currentProgress = Math.min(currentProgress, 100);

        const deadlineDate = goal.deadline ? goal.deadline.toDate() : new Date();
        const diffTime = deadlineDate - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const ddayText = diffDays > 0 ? `D-${diffDays}` : (diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)}`);

        const inputPlaceholder = goal.updateType === 'set' ? '= 설정할 퍼센트' : '+ 추가할 퍼센트';
        const updateMethodLabel = goal.updateType === 'set' ? '진척도 설정' : '진척도 추가';
        const buttonColor = goal.updateType === 'set' ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100';
        const focusColor = goal.updateType === 'set' ? 'focus:ring-purple-500 focus:border-purple-500' : 'focus:ring-blue-500 focus:border-blue-500';

        // 카드 뷰 (우측 상단에 히스토리 아이콘 버튼 추가)
        const cardHtml = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center">
                        <div class="${goal.updateType === 'set' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'} p-3 rounded-lg mr-4">
                            <i class="fa-solid fa-bullseye text-xl"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-gray-900">${goal.title}</h3>
                            <p class="text-xs text-gray-500 mt-1">${ddayText} · ${goal.durationDays}일 계획 <span class="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">${updateMethodLabel} 모드</span></p>
                        </div>
                    </div>
                    <!-- 히스토리 버튼 추가됨 -->
                    <button onclick="openHistoryModal('${goal.id}', '${goal.title}', '${goal.updateType}')" class="text-gray-400 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-gray-50" title="기록 보기">
                        <i class="fa-solid fa-clock-rotate-left text-lg"></i>
                    </button>
                </div>
                
                <div class="mb-2 flex justify-between text-sm">
                    <span class="font-medium text-gray-700">진행률</span>
                    <span class="${goal.updateType === 'set' ? 'text-purple-600' : 'text-blue-600'} font-bold">${currentProgress}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden relative">
                    <div class="progress-bar-fill ${goal.updateType === 'set' ? 'bg-purple-500' : 'bg-blue-500'} h-2.5 rounded-full" style="width: ${currentProgress}%"></div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span class="text-sm text-gray-600 font-medium">${updateMethodLabel} (%)</span>
                    <div class="flex items-center space-x-2">
                        <input type="number" id="input-${goal.id}" placeholder="${inputPlaceholder}" class="w-28 text-sm border-gray-300 rounded-md shadow-sm ${focusColor} px-2 py-1.5 border">
                        <button onclick="addProgressPercent('${goal.id}', 'input-${goal.id}')" class="${buttonColor} px-3 py-1.5 rounded-md text-sm font-medium transition-colors">기록</button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

/* ==========================================
   데이터 DB 전송
   ========================================== */
window.addProgressPercent = async function(goalId, inputId) {
    const val = Number(document.getElementById(inputId).value);
    if(isNaN(val)) return;

    try {
        await addDoc(collection(db, "progress"), {
            goalId: goalId,
            value: val, 
            timestamp: new Date()
        });
        document.getElementById(inputId).value = ''; 
    } catch (e) {
        console.error("Error adding progress: ", e);
    }
}

window.saveNewGoal = async function() {
    const title = document.getElementById('goalTitle').value;
    const days = parseInt(document.getElementById('selectedDays').value);
    const updateType = document.querySelector('input[name="updateType"]:checked').value;

    if(!title || isNaN(days)) {
        document.getElementById('durationError').classList.remove('hidden');
        return;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    try {
        await addDoc(collection(db, "goals"), {
            title: title,
            durationDays: days,
            updateType: updateType,
            createdAt: new Date(),
            deadline: deadline
        });
        closeModal();
    } catch (e) {
        console.error("Error saving new goal: ", e);
    }
}

/* ==========================================
   [UI 컨트롤] 새 목표 모달
   ========================================== */
const modal = document.getElementById('goalModal');
const body = document.body;

window.openNewGoalModal = function() {
    document.getElementById('newGoalForm').reset();
    document.getElementById('selectedDays').value = '';
    document.getElementById('durationError').classList.add('hidden');
    
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
    
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('border-gray-300', 'text-gray-600');
    });
    
    btnElement.classList.remove('border-gray-300', 'text-gray-600');
    btnElement.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
}

/* ==========================================
   [UI 컨트롤] 히스토리 모달 로직 (새로 추가됨)
   ========================================== */
window.openHistoryModal = function(goalId, goalTitle, updateType) {
    const historyModal = document.getElementById('historyModal');
    const listContainer = document.getElementById('historyList');
    
    // 모달 타이틀 업데이트
    document.getElementById('historyGoalTitle').innerText = goalTitle;

    // 해당 목표의 로그만 필터링 후 최신순(내림차순)으로 정렬
    const goalLogs = rawProgressLogs
        .filter(log => log.goalId === goalId)
        .sort((a, b) => b.timestamp - a.timestamp); 

    listContainer.innerHTML = ''; // 기존 리스트 초기화

    if (goalLogs.length === 0) {
        listContainer.innerHTML = '<li class="text-center text-gray-400 py-8 text-sm">아직 기록된 진척도가 없습니다.</li>';
    } else {
        goalLogs.forEach(log => {
            // Firestore Timestamp를 JS Date 객체로 변환
            const date = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp || Date.now());
            
            // 날짜 예쁘게 포맷팅 (예: 2026. 08. 17. 14:30)
            const dateString = date.toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
            
            // 모드에 따른 기호 및 색상 처리
            const prefix = updateType === 'set' ? '=' : '+';
            const textColor = updateType === 'set' ? 'text-purple-600' : 'text-blue-600';

            const li = document.createElement('li');
            li.className = 'flex justify-between items-center py-3 border-b border-gray-100 last:border-0';
            li.innerHTML = `
                <span class="text-sm text-gray-500">${dateString}</span>
                <span class="font-bold ${textColor}">${prefix}${log.value}%</span>
            `;
            listContainer.appendChild(li);
        });
    }

    // 모달 띄우기
    historyModal.classList.remove('opacity-0', 'pointer-events-none');
    body.classList.add('modal-active');
}

window.closeHistoryModal = function() {
    const historyModal = document.getElementById('historyModal');
    historyModal.classList.add('opacity-0', 'pointer-events-none');
    body.classList.remove('modal-active');
}
