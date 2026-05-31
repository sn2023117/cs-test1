let tasks = [
    { name: "영어 단어 암기", time: 15 },
    { name: "전공 서적 읽기", time: 40 }
];

// 초기 리스트 표시
renderTasks();

function addTask() {
    const name = document.getElementById("taskName").value;
    const time = Number(document.getElementById("taskTime").value);

    if (!name || !time) {
        alert("할 일과 소요 시간을 입력해주세요!");
        return;
    }

    tasks.push({ name, time });
    renderTasks();
    
    document.getElementById("taskName").value = "";
    document.getElementById("taskTime").value = "";
}

function renderTasks() {
    const listDiv = document.getElementById("taskList");
    listDiv.innerHTML = tasks.map(t => `
        <div class="task-item">
            <span>✅ ${t.name}</span>
            <span>${t.time}분</span>
        </div>
    `).join('');
}

function analyze() {
    const free = Number(document.getElementById("freeTime").value);
    const travel = Number(document.getElementById("travelTime").value);
    const cost = Number(document.getElementById("cost").value);

    if (!free || !travel) {
        alert("시간 정보를 입력해주세요!");
        return;
    }

    const realTime = free - (travel * 2);

    if (realTime < 0) {
        alert("이동 시간이 여유 시간보다 깁니다! 일정을 다시 확인하세요.");
        return;
    }

    // 결과 창 노출 및 데이터 반영
    document.getElementById("initial-msg").style.display = "none";
    document.getElementById("result-area").style.display = "block";

    document.getElementById("res-time").innerText = realTime;
    document.getElementById("res-cost").innerText = (cost * 2).toLocaleString();

    // 시간 내 가능한 활동 필터링
    const possible = tasks.filter(t => t.time <= realTime);
    const taskHtml = possible.length > 0 
        ? possible.map(t => `• ${t.name} (${t.time}분)`).join('<br>')
        : "추천할 활동이 없습니다. 충분한 휴식을 취하세요!";
    
    document.getElementById("res-tasks").innerHTML = `<div style="margin-top:10px;">${taskHtml}</div>`;

    // 주변 시설 추천 로직
    let tip = "";
    if (realTime >= 60) {
        tip = "📍 근처 <b>스터디카페</b>나 <b>도서관</b>으로 이동하는 것을 추천합니다.";
    } else if (realTime >= 20) {
        tip = "📍 가까운 <b>카페</b>에서 가벼운 작업을 추천합니다.";
    } else {
        tip = "📍 시간이 짧으니 <b>벤치</b>나 <b>휴게실</b> 이용을 권장합니다.";
    }
    document.getElementById("res-place").innerHTML = tip;
}
