import { db, rawProgressLogs } from './main.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const body = document.body;
const goalModal = document.getElementById('goalModal');
const historyModal = document.getElementById('historyModal');
const goalTitleInput = document.getElementById('goalTitle');

// 🔥 [스마트 자동 선택] 수동으로 선택했는지 여부를 추적하는 플래그
let isDurationManuallySelected = false; 

/* ==========================================
   [자동화] 텍스트 입력 감지 (정규식 기반)
   ========================================== */
goalTitleInput.addEventListener('input', (e) => {
    // 유저가 하단 버튼을 직접 누른 적이 있다면, 타이틀 입력에 반응하지 않음 (유저 의도 우선)
    if (isDurationManuallySelected) return;

    const text = e.target.value;
    
    // 매칭 규칙: 공백 무시, '1주', '4달' 형태의 숫자+단위만 캐치
    // (예: "1주 안에 10km" -> 1주 매칭, "6 달 뒤 바디프로필" -> 6달 매칭)
    const regex = /([1-4])\s*주|([1-6])\s*달/g;
    let match;
    let lastMatchData = null;

    // 문자열 전체를 스캔하여 가장 마지막에 등장한 패턴을 채택함 ("1주차 쉬고 2주차 달린다" -> 2주 선택)
    while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
            lastMatchData = { type: 'week', val: parseInt(match[1]) };
        } else if (match[2]) {
            lastMatchData = { type: 'month', val: parseInt(match[2]) };
        }
    }

    if (lastMatchData) {
        let targetDays = 0;
        if (lastMatchData.type === 'week') targetDays = lastMatchData.val * 7;
        if (lastMatchData.type === 'month') targetDays = lastMatchData.val * 30;

        // 버튼을 찾아서 시각적 선택 효과 적용
        const targetBtn = document.querySelector(`.duration-btn[onclick*="selectDuration(${targetDays},"]`);
        if (targetBtn) {
            // isDurationManuallySelected 플래그를 건드리지 않고 자동 선택만 수행
            document.getElementById('selectedDays').value = targetDays;
            document.getElementById('durationError').classList.add('hidden');
            
            document.querySelectorAll('.duration-btn').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
                btn.classList.add('border-gray-300', 'text-gray-600');
            });
            
            targetBtn.classList.remove('border-gray-300', 'text-gray-600');
            targetBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        }
    }
});

/* ==========================================
   [UI 컨트롤] 기간 버튼 선택 (수동 조작)
   ========================================== */
window.selectDuration = function(days, btnElement) {
    // 유저가 명시적으로 버튼을 클릭했으므로, 텍스트 자동 선택 기능을 차단함
    isDurationManuallySelected = true;

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
   [UI 컨트롤] 새 목표 모달 열기/닫기
   ========================================== */
window.openNewGoalModal = function() {
    document.getElementById('newGoalForm').reset();
    document.getElementById('selectedDays').value = '';
    document.getElementById('durationError').classList.add('hidden');
    
    // 모달을 열 때 수동 선택 플래그를 초기화
    isDurationManuallySelected = false;
    
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('border-gray-300', 'text-gray-600');
    });

    goalModal.classList.remove('opacity-0', 'pointer-events-none');
    body.classList.add('modal-active');
}

window.closeModal = function() {
    goalModal.classList.add('opacity-0', 'pointer-events-none');
    body.classList.remove('modal-active');
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
   [UI 컨트롤] 히스토리 모달 열기/닫기
   ========================================== */
window.openHistoryModal = function(goalId, goalTitle, updateType) {
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
    body.classList.add('modal-active');
}

window.closeHistoryModal = function() {
    historyModal.classList.add('opacity-0', 'pointer-events-none');
    body.classList.remove('modal-active');
}