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
    const activeContainer = document.getElementById('goals-container');
    const completedContainer = document.getElementById('completed-goals-container');
    const activeWrapper = document.getElementById('active-goals-wrapper');
    const completedWrapper = document.getElementById('completed-goals-wrapper');
    
    activeContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    let activeCount = 0;
    let completedCount = 0;

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
        
        // 🔥 100% 달성 여부 판별
        const isCompleted = currentProgress >= 100;
        // 뷰포트가 깨지지 않도록 프로그레스바 그래픽 너비만 최대 100%로 제한
        const progressBarWidth = Math.min(currentProgress, 100); 

        const deadlineDate = goal.deadline ? goal.deadline.toDate() : new Date();
        const diffTime = deadlineDate - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const ddayText = diffDays > 0 ? `D-${diffDays}` : (diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)}`);

        const inputPlaceholder = goal.updateType === 'set' ? '= 설정할 퍼센트' : '+ 추가할 퍼센트';
        const updateMethodLabel = goal.updateType === 'set' ? '진척도 설정' : '진척도 추가';
        const buttonColor = goal.updateType === 'set' ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100';
        const focusColor = goal.updateType === 'set' ? 'focus:ring-purple-500 focus:border-purple-500' : 'focus:ring-blue-500 focus:border-blue-500';
        const progressTextColor = goal.updateType === 'set' ? 'text-purple-600' : 'text-blue-600';
        const progressFillColor = goal.updateType === 'set' ? 'bg-purple-500' : 'bg-blue-500';

        // 🔥 달성(isCompleted) 상태에 따라 카드 테마 변경
        const cardBgClass = isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:shadow-md';
        
        // 🔥 달성(isCompleted) 상태에 따라 하단 입력부 영역 교체 (비활성화)
        let inputSectionHtml = '';
        if (isCompleted) {
            inputSectionHtml = `
                <div class="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                    <div class="text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 px-4 py-2.5 rounded-lg w-full text-center flex items-center justify-center shadow-inner">
                        <i class="fa-solid fa-lock mr-2"></i> 목표 달성으로 기록이 마감되었습니다
                    </div>
                </div>
            `;
        } else {
            inputSectionHtml = `
                <div class="mt-4 pt-4 border-t border-gray-50 flex flex-col space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-600 font-medium">${updateMethodLabel} (%)</span>
                        <div class="flex items-center space-x-2">
                            <input type="number" id="input-${goal.id}" placeholder="${inputPlaceholder}" class="w-28 text-sm border-gray-300 rounded-md shadow-sm ${focusColor} px-2 py-1.5 border">
                            <button onclick="addProgressPercent('${goal.id}', 'input-${goal.id}', 'comment-${goal.id}')" class="${buttonColor} px-3 py-1.5 rounded-md text-sm font-medium transition-colors">기록</button>
                        </div>
                    </div>
                    <input type="text" id="comment-${goal.id}" placeholder="오늘의 기분을 입력해보세요" class="w-full text-xs text-gray-700 border-gray-200 rounded-md shadow-sm ${focusColor} px-3 py-2 border bg-gray-50 focus:bg-white transition-colors">
                </div>
            `;
        }

        const cardHtml = `
            <div class="rounded-xl shadow-sm border p-5 transition-shadow relative ${cardBgClass}">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center">
                        <div class="${goal.updateType === 'set' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'} p-3 rounded-lg mr-4 ${isCompleted ? 'opacity-50' : ''}">
                            <i class="fa-solid fa-bullseye text-xl"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-gray-900">${goal.title}</h3>
                            <p class="text-xs text-gray-500 mt-1">${ddayText} · ${goal.durationDays}일 계획 <span class="ml-1 text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">${updateMethodLabel} 모드</span></p>
                        </div>
                    </div>
                    <button onclick="openHistoryModal('${goal.id}', '${goal.title}', '${goal.updateType}')" class="text-gray-400 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-gray-100" title="기록 보기">
                        <i class="fa-solid fa-clock-rotate-left text-lg"></i>
                    </button>
                </div>
                
                <div class="mb-2 flex justify-between text-sm">
                    <span class="font-medium text-gray-700">진행률</span>
                    <span class="${progressTextColor} font-bold">${currentProgress}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden relative">
                    <div class="progress-bar-fill ${progressFillColor} h-2.5 rounded-full" style="width: ${progressBarWidth}%"></div>
                </div>
                
                ${inputSectionHtml}
            </div>
        `;
        
        // 완료 여부에 따라 다른 컨테이너에 주입
        if (isCompleted) {
            completedContainer.insertAdjacentHTML('beforeend', cardHtml);
            completedCount++;
        } else {
            activeContainer.insertAdjacentHTML('beforeend', cardHtml);
            activeCount++;
        }
    });

    // 영역 보이기/숨기기 처리
    if (activeCount > 0) {
        activeWrapper.classList.remove('hidden');
    } else {
        activeContainer.innerHTML = '<div class="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed text-gray-400">현재 진행 중인 목표가 없습니다. 새로운 목표를 설정해보세요!</div>';
    }

    if (completedCount > 0) {
        completedWrapper.classList.remove('hidden');
    } else {
        completedWrapper.classList.add('hidden');
    }
}

/* ==========================================
   데이터 DB 전송
   ========================================== */
window.addProgressPercent = async function(goalId, inputId, commentId) {
    const val = Number(document.getElementById(inputId).value);
    const commentVal = document.getElementById(commentId).value.trim(); 
    
    if(isNaN(val) || val === 0) return; 

    try {
        await addDoc(collection(db, "progress"), {
            goalId: goalId,
            value: val, 
            comment: commentVal, 
            timestamp: new Date()
        });
        
        document.getElementById(inputId).value = ''; 
        document.getElementById(commentId).value = ''; 
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
   [UI 컨트롤] 히스토리 모달 로직
   ========================================== */
window.openHistoryModal = function(goalId, goalTitle, updateType) {
    const historyModal = document.getElementById('historyModal');
    const listContainer = document.getElementById('historyList');
    
    document.getElementById('historyGoalTitle').innerText = goalTitle;

    let goalLogs = rawProgressLogs
        .filter(log => log.goalId === goalId)
        .sort((a, b) => a.timestamp - b.timestamp); 

    let cumulative = 0;
    goalLogs = goalLogs.map(log => {
        if (updateType === 'add') {
            cumulative += log.value;
            return { ...log, currentTotal: cumulative };
        } else {
            return { ...log, currentTotal: log.value };
        }
    });

    goalLogs.sort((a, b) => b.timestamp - a.timestamp);

    listContainer.innerHTML = '';

    if (goalLogs.length === 0) {
        listContainer.innerHTML = '<li class="text-center text-gray-400 py-8 text-sm">아직 기록된 진척도가 없습니다.</li>';
    } else {
        goalLogs.forEach(log => {
            const date = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp || Date.now());
            
            const dateString = date.toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
            
            const prefix = updateType === 'set' ? '=' : '+';
            const isOver100 = log.currentTotal >= 100;
            
            const highlightBg = isOver100 ? 'bg-amber-50/60 px-3 -mx-3 rounded-xl' : '';
            const badgeHtml = isOver100 
                ? `<span class="ml-2 text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full shadow-sm">🎉 목표 100% 달성</span>` 
                : '';
                
            const textColor = updateType === 'set' 
                ? (isOver100 ? 'text-purple-600 font-extrabold' : 'text-purple-600 font-bold') 
                : (isOver100 ? 'text-blue-600 font-extrabold' : 'text-blue-600 font-bold');
            
            const commentHtml = log.comment 
                ? `<div class="mt-2 w-full flex">
                     <div class="relative text-sm text-gray-900 bg-gray-200 rounded-2xl px-3.5 py-2 w-fit max-w-[95%] break-words">
                       <div class="absolute -top-1 left-4 w-3 h-3 bg-gray-200 rotate-45 rounded-sm"></div>
                       <span class="relative z-10 leading-snug block">${log.comment}</span>
                     </div>
                   </div>` 
                : '';

            const li = document.createElement('li');
            li.className = `flex flex-col py-3 border-b border-gray-100 last:border-0 transition-colors ${highlightBg}`;
            li.innerHTML = `
                <div class="flex justify-between items-center w-full">
                    <div class="flex items-center">
                        <span class="text-sm ${isOver100 ? 'text-gray-800 font-medium' : 'text-gray-500'}">${dateString}</span>
                        ${badgeHtml}
                    </div>
                    <span class="${textColor}">${prefix}${log.value}%</span>
                </div>
                ${commentHtml}
            `;
            listContainer.appendChild(li);
        });
    }

    historyModal.classList.remove('opacity-0', 'pointer-events-none');
    document.body.classList.add('modal-active');
}

window.closeHistoryModal = function() {
    const historyModal = document.getElementById('historyModal');
    historyModal.classList.add('opacity-0', 'pointer-events-none');
    document.body.classList.remove('modal-active');
}
