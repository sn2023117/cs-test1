let tasks=[];

const facilities={

집:[
"GS25",
"메가커피",
"도서관"
],

학교:[
"스터디카페",
"열람실",
"편의점"
],

알바:[
"CU",
"카페",
"헬스장"
]

};

function addTask(){

const place=
document.getElementById(
"taskPlace"
).value;

const name=
document.getElementById(
"taskName"
).value;

const time=
Number(
document.getElementById(
"taskTime"
).value
);

if(!name||!time)return;

tasks.push({
place,
name,
time
});

renderTasks();

}

function renderTasks(){

let html="";

tasks.forEach(task=>{

html+=`
<div class="task">
${task.place}
|
${task.name}
(${task.time}분)
</div>
`;

});

document.getElementById(
"taskList"
).innerHTML=html;

}

function analyze(){

const free=
Number(
document.getElementById(
"freeTime"
).value
);

const travel=
Number(
document.getElementById(
"travelTime"
).value
);

const cost=
Number(
document.getElementById(
"cost"
).value
);

const meal=
Number(
document.getElementById(
"mealHour"
).value
);

const place=
document.getElementById(
"location"
).value;

let realTime=
free-(travel*2);

let mealNeed="낮음";

if(meal>=5){

mealNeed="높음";

realTime-=30;

}
else if(meal>=3){

mealNeed="보통";

realTime-=15;

}

const possible=
tasks.filter(
t=>t.time<=realTime
);

let recommend="";

if(possible.length===0){

recommend=
`
<div class="task">
휴식을 추천합니다
</div>
`;

}
else{

possible.forEach(task=>{

recommend+=`
<div class="task">

<b>${task.name}</b>

<br>

${task.time}분

</div>
`;

});

}

document.getElementById(
"timeResult"
).innerText=
realTime+"분";

document.getElementById(
"costResult"
).innerText=
(cost*2).toLocaleString()+"원";

document.getElementById(
"mealResult"
).innerText=
mealNeed;

let score=
Math.max(
0,
Math.min(
100,
Math.round(
(realTime/free)*100
)
)
);

document.getElementById(
"scoreResult"
).innerText=
score+"%";

document.getElementById(
"recommendTasks"
).innerHTML=
recommend;

document.getElementById(
"facilityResult"
).innerHTML=

facilities[place]
.map(
f=>`<div class="facility">${f}</div>`
)
.join("");

document.getElementById(
"inputPage"
).classList.add(
"hidden"
);

document.getElementById(
"resultPage"
).classList.remove(
"hidden"
);

}

function goBack(){

document.getElementById(
"resultPage"
).classList.add(
"hidden"
);

document.getElementById(
"inputPage"
).classList.remove(
"hidden"
);

}
