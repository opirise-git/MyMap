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
export const db = getFirestore(app);

// window 전역 스코프에 노출 (인라인 이벤트 리스너용)
window.db = db;
window.collection = collection;
window.addDoc = addDoc;

export let goalsData = [];
export let rawProgressLogs = [];

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
        
        const isCompleted = currentProgress >= 100;
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

        const cardBgClass = isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:shadow-md';
        
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
        
        if (isCompleted) {
            completedContainer.insertAdjacentHTML('beforeend', cardHtml);
            completedCount++;
        } else {
            activeContainer.insertAdjacentHTML('beforeend', cardHtml);
            activeCount++;
        }
    });

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
   데이터 DB 전송 (Progress 추가)
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