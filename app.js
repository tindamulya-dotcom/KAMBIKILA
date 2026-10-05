
const KEY="kambikila_v3";
const DEFAULT_WORKERS=[
 {id:"patrick",name:"Patrick",role:"Tous travaux",salaryFC:200000,salaryUSD:0,startDate:"01/09/2026",payDay:5,lodging:true,status:"Actif"},
 {id:"martin",name:"Martin",role:"Tous travaux",salaryFC:200000,salaryUSD:0,startDate:"01/09/2026",payDay:5,lodging:true,status:"Actif"},
 {id:"emmanuel",name:"Emmanuel",role:"Superviseur",salaryFC:0,salaryUSD:50,startDate:"01/09/2026",payDay:5,lodging:false,status:"Actif"}
];
const DEFAULT_PAYROLL=[
 {id:"pay-2026-09-patrick",workerId:"patrick",period:"Septembre 2026",dueDate:"05/10/2026",status:"À payer",paidDate:"",method:"",fc:200000,usd:0},
 {id:"pay-2026-09-martin",workerId:"martin",period:"Septembre 2026",dueDate:"05/10/2026",status:"À payer",paidDate:"",method:"",fc:200000,usd:0},
 {id:"pay-2026-09-emmanuel",workerId:"emmanuel",period:"Septembre 2026",dueDate:"05/10/2026",status:"À payer",paidDate:"",method:"",fc:142500,usd:50}
];
let state = loadState();
let currentPage="dashboard";

function clone(x){return JSON.parse(JSON.stringify(x))}
function normalizeState(data){
  const d=clone(data||window.KAMBIKILA_INITIAL_DATA);
  d.funding=d.funding||[]; d.expenses=d.expenses||[]; d.quotes=d.quotes||[]; d.sales=d.sales||[]; d.monthly=d.monthly||[];
  d.settings=d.settings||{exchangeRate:2850,safetyMargin:0,projectName:"Projet Kambikila"};
  d.settings.branding=d.settings.branding||{logo:"assets/kambikila-logo.png",background:"assets/farm-background.jpg"};
  d.materials=d.materials||[];
  d.workers=(d.workers&&d.workers.length?d.workers:clone(DEFAULT_WORKERS));
  d.payrollPayments=d.payrollPayments||clone(DEFAULT_PAYROLL);
  return d;
}
function loadState(){
  const saved=localStorage.getItem(KEY);
  if(saved){try{return normalizeState(JSON.parse(saved))}catch(e){}}
  // Migration depuis la V2 si elle existe sur ce navigateur.
  const old=localStorage.getItem("kambikila_v2");
  if(old){try{const migrated=normalizeState(JSON.parse(old));localStorage.setItem(KEY,JSON.stringify(migrated));return migrated}catch(e){}}
  return normalizeState(window.KAMBIKILA_INITIAL_DATA);
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function moneyFC(n){return new Intl.NumberFormat("fr-FR").format(Math.round(Number(n)||0))+" FC"}
function moneyUSD(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0)}
function usdMini(fc){const v=(Number(fc)||0)/state.settings.exchangeRate;return "≈ "+new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v)}
function dualFC(fc, cls=""){return `<div class="fc-main ${cls}">${moneyFC(fc)}</div><div class="usd-mini">${usdMini(fc)}</div>`}
function applyBranding(){const b=state.settings.branding||{};document.documentElement.style.setProperty("--farm-bg",`url(${JSON.stringify(b.background||"assets/farm-background.jpg")})`);const logo=document.getElementById("brandLogo");if(logo)logo.src=b.logo||"assets/kambikila-logo.png";}
function readImage(file,cb){if(!file)return;const r=new FileReader();r.onload=()=>cb(r.result);r.readAsDataURL(file)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function total(a,k){return a.reduce((s,x)=>s+(Number(x[k])||0),0)}
function fundingFC(){return total(state.funding,"fc")+total(state.funding,"usd")*state.settings.exchangeRate}
function totalFinancedFC(){return state.funding.reduce((s,x)=>s+(Math.max(0,Number(x.fc)||0)+Math.max(0,Number(x.usd)||0)*state.settings.exchangeRate),0)}
function totalWithdrawnFC(){return state.funding.reduce((s,x)=>s+(Math.max(0,-Number(x.fc)||0)+Math.max(0,-Number(x.usd)||0)*state.settings.exchangeRate),0)}
function payrollPaidFC(){return (state.payrollPayments||[]).filter(x=>x.status==="Payé").reduce((s,x)=>s+(Number(x.fc)||0)+(Number(x.usd)||0)*state.settings.exchangeRate,0)}
function payrollDueFC(){return (state.payrollPayments||[]).filter(x=>x.status!=="Payé").reduce((s,x)=>s+(Number(x.fc)||0)+(Number(x.usd)||0)*state.settings.exchangeRate,0)}
function monthlyPayrollFC(){return (state.workers||[]).reduce((s,w)=>s+(Number(w.salaryFC)||0)+(Number(w.salaryUSD)||0)*state.settings.exchangeRate,0)}
function expenseFC(){return total(state.expenses,"fc")+total(state.expenses,"usd")*state.settings.exchangeRate+payrollPaidFC()}
function salesFC(){return total(state.sales,"fc")}
function availableFC(){return fundingFC()-expenseFC()}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300)}
function openModal(title,body){document.getElementById("modal").innerHTML=`<h2>${title}</h2>${body}`;document.getElementById("modalBackdrop").classList.remove("hidden")}
function closeModal(){document.getElementById("modalBackdrop").classList.add("hidden")}
document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});

function setPage(page){
 currentPage=page;
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 document.getElementById("pageTitle").textContent={dashboard:"Tableau de bord",funding:"Financements",expenses:"Dépenses",quotes:"Devis & activités",sales:"Recettes & ventes",workers:"Travailleurs & paie",settings:"Paramètres",materials:"Matériels"}[page];
 render();
}
document.getElementById("nav").addEventListener("click",e=>{const b=e.target.closest(".nav-item");if(b)setPage(b.dataset.page)});
document.getElementById("quickAdd").addEventListener("click",()=>quickAdd());


function filteredRows(type){
 const q=(document.getElementById("tableSearch")?.value||"").toLowerCase(),sec=document.getElementById("sectorFilter")?.value||"",st=document.getElementById("statusFilter")?.value||"";
 return(state[type]||[]).filter(x=>{const s=JSON.stringify(x).toLowerCase();return(!q||s.includes(q))&&(!sec||String(x.sector||"").includes(sec))&&(!st||String(x.status||"").includes(st));});
}
function exportRows(type){
 const rows=filteredRows(type);
 if(type==="funding") return {head:["Date","Mode","USD","FC","Note"],body:rows.map(x=>[x.date,x.mode,x.usd,x.fc,x.note])};
 if(type==="expenses") return {head:["Date","Secteur","Description","USD","FC"],body:[...rows.map(x=>[x.date,x.sector,x.description,x.usd,x.fc]),...(state.payrollPayments||[]).filter(p=>p.status==="Payé").map(p=>{const w=workerById(p.workerId);return [p.paidDate,"Paie","Salaire "+w.name+" — "+p.period,p.usd,p.fc]})]};
 if(type==="quotes") return {head:["N°","Désignation","Secteur","Statut","Prévu FC","Dépensé FC","Reste FC"],body:rows.map(x=>[x.id,x.name,x.sector,x.status,x.planned,x.spent,(x.planned||0)-(x.spent||0)])};
 return {head:["Date","Projet","Description","Quantité","Recette FC"],body:rows.map(x=>[x.date,x.project,x.description,x.quantity,x.fc])};
}
function csvEscape(v){const s=String(v??"");return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function exportCSV(type,label){const d=exportRows(type);const csv="\uFEFF"+[d.head,...d.body].map(r=>r.map(csvEscape).join(";")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="Kambikila_"+label+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("CSV généré");}
function exportExcel(type,label){const d=exportRows(type);if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([d.head,...d.body]);XLSX.utils.book_append_sheet(wb,ws,label.slice(0,31));XLSX.writeFile(wb,"Kambikila_"+label+".xlsx");toast("Excel généré");}else{exportCSV(type,label);toast("Bibliothèque Excel indisponible : CSV généré");}}
function exportPDF(type,label){const d=exportRows(type);const body=d.body.map(r=>r.map(v=>String(v??"")));if(window.pdfMake){pdfMake.createPdf({pageSize:"A4",pageOrientation:"landscape",content:[{text:"PROJET KAMBIKILA",style:"title"},{text:label+" — rapport",style:"sub"},{text:"Généré le "+new Date().toLocaleDateString("fr-FR")+" | 1 USD = "+new Intl.NumberFormat("fr-FR").format(state.settings.exchangeRate)+" FC",style:"sub"},{table:{headerRows:1,body:[d.head,...body]},layout:"lightHorizontalLines"}],styles:{title:{fontSize:18,bold:true,color:"#145f3c"},sub:{fontSize:9,color:"#68756d",margin:[0,0,0,8]}}}).download("Kambikila_"+label+".pdf");toast("PDF généré");}else{alert("Le module PDF n'est pas disponible. Ouvrez l'application avec Internet pour activer l'export PDF.");}}
function exportButtons(type,label){return `<div class="export-buttons"><button class="secondary-btn" onclick="exportPDF('${type}','${label}')">PDF</button><button class="secondary-btn" onclick="exportCSV('${type}','${label}')">CSV</button><button class="secondary-btn" onclick="exportExcel('${type}','${label}')">Excel</button></div>`;}
function render(){
 applyBranding();
 document.getElementById("topRate").textContent=new Intl.NumberFormat("fr-FR").format(state.settings.exchangeRate)+" FC";
 const c=document.getElementById("content");
 if(currentPage==="dashboard") c.innerHTML=dashboard();
 if(currentPage==="funding") c.innerHTML=fundingPage();
 if(currentPage==="expenses") c.innerHTML=expensesPage();
 if(currentPage==="quotes") c.innerHTML=quotesPage();
 if(currentPage==="sales") c.innerHTML=salesPage();
 if(currentPage==="workers") c.innerHTML=workersPage();
 if(currentPage==="settings") c.innerHTML=settingsPage();
 if(currentPage==="materials") c.innerHTML=materialsPage();
 wirePage();
}
function dashboard(){
 const f=fundingFC(), e=expenseFC(), r=salesFC(), balance=totalFinancedFC()-totalWithdrawnFC()-e;
 const tomatoE=total(state.expenses.filter(x=>x.sector==="Tomates"),"fc");
 const rehabE=total(state.expenses.filter(x=>x.sector==="Réhabilitation"),"fc");
 const poultryE=total(state.expenses.filter(x=>x.sector==="Poules"),"fc");
 const tomatoR=total(state.sales.filter(x=>x.project==="Tomates"),"fc");
 const poultryR=total(state.sales.filter(x=>x.project==="Poules"),"fc");
 const planned=total(state.quotes,"planned"), spent=total(state.quotes,"spent");
 const done=state.quotes.filter(x=>String(x.status).toLowerCase().includes("réalis")).length;
 const pct=planned?Math.min(100,spent/planned*100):0;
 return `
 <div class="notice"><b>Phase actuelle :</b> investissement et aménagement. Les sorties d’argent sont donc suivies comme dépenses d’investissement/activité, tandis que les recettes pourront être ajoutées au fur et à mesure des ventes.</div>
 <div class="grid kpis">
  <div class="card kpi green accent-card"><div class="label">TOTAL FINANCÉ JUSQU’À CE JOUR</div>${dualFC(totalFinancedFC())}<div class="sub">Somme de tous les financements reçus</div></div>
  <div class="card kpi blue-card"><div class="label">DÉPENSES TOTALES</div>${dualFC(e)}<div class="sub">${state.expenses.length + state.payrollPayments.filter(x=>x.status==="Payé").length} opérations, salaires inclus</div></div>
  <div class="card kpi amber"><div class="label">RETRAITS TOTAUX</div>${dualFC(totalWithdrawnFC())}<div class="sub">Retraits M-Pesa et autres enregistrés</div></div>
  <div class="card kpi purple-card"><div class="label">SOLDE DISPONIBLE</div>${dualFC(balance)}<div class="sub">Financements − retraits − dépenses</div></div>
 </div>
 <div class="card section finance-total-panel"><div class="section-head"><h2>Situation des financements</h2><span class="pill done">Actualisé</span></div><div class="metric-row"><span>Total reçu / financé</span><strong>${moneyFC(totalFinancedFC())}</strong></div><div class="metric-row"><span>Retraits enregistrés</span><strong>${moneyFC(totalWithdrawnFC())}</strong></div><div class="metric-row"><span>Financement net après retraits</span><strong>${moneyFC(totalFinancedFC()-totalWithdrawnFC())}</strong></div><div class="metric-row"><span>Dépenses documentées</span><strong>${moneyFC(e)}</strong></div></div>
 <div class="grid two">
  <div class="card section"><div class="section-head"><h2>Évolution financière</h2><div class="legend"><span><b></b>Dépenses</span><span><b class="s"></b>Recettes</span></div></div>${monthlyChart()}</div>
  <div class="card section"><div class="section-head"><h2>Consommation des fonds</h2><span>${f?((e/f)*100).toFixed(1):0}% consommé</span></div>
    <div class="stat-big">${moneyFC(e)}</div><div class="bar"><i style="width:${f?Math.min(100,e/f*100):0}%"></i></div>
    <div class="metric-row"><span>Fonds injectés</span><strong>${moneyFC(f)}</strong></div>
    <div class="metric-row"><span>Dépenses terrain</span><strong>${moneyFC(e)}</strong></div>
    <div class="metric-row"><span>Disponible</span><strong class="positive">${moneyFC(balance)}</strong></div>
  </div>
 </div>
 <div class="grid three" style="margin-top:16px">
  ${activityCard("Tomates / légumes",tomatoR,tomatoE)}
  ${activityCard("Poules / volailles",poultryR,poultryE)}
  ${activityCard("Réhabilitation",0,rehabE)}
 </div>
 <div class="grid two" style="margin-top:16px">
  <div class="card section payroll-dashboard"><div class="section-head"><h2>Travailleurs & paie</h2><span>${state.workers.length} travailleurs actifs</span></div>
   <div class="metric-row"><span>Masse salariale mensuelle</span><strong>${moneyFC(monthlyPayrollFC())}</strong></div>
   <div class="metric-row"><span>Salaires à payer</span><strong class="negative">${moneyFC(payrollDueFC())}</strong></div>
   <div class="metric-row"><span>Salaires déjà payés</span><strong class="positive">${moneyFC(payrollPaidFC())}</strong></div>
   <button class="primary-btn" style="margin-top:10px" onclick="setPage('workers')">Ouvrir Travailleurs & paie</button>
  </div>
  <div class="card section"><div class="section-head"><h2>Prochaine paie</h2><span>05/10/2026</span></div>
   <div class="employee-mini"><span class="avatar">P</span><div><b>Patrick</b><small>200 000 FC · Tous travaux</small></div></div>
   <div class="employee-mini"><span class="avatar">M</span><div><b>Martin</b><small>200 000 FC · Tous travaux</small></div></div>
   <div class="employee-mini"><span class="avatar">E</span><div><b>Emmanuel</b><small>50 USD · Superviseur</small></div></div>
  </div>
 </div>
 <div class="card section" style="margin-top:16px"><div class="section-head"><h2>Avancement du devis</h2><span>${done} / ${state.quotes.length} articles réalisés</span></div>
  <div class="metric-row"><span>Budget prévu</span><strong>${moneyFC(planned)}</strong></div>
  <div class="metric-row"><span>Déjà dépensé sur devis</span><strong>${moneyFC(spent)}</strong></div>
  <div class="bar"><i style="width:${pct}%"></i></div>
  <div class="muted" style="font-size:10px">${pct.toFixed(1)}% du budget chiffré a été consommé.</div>
 </div>`;
}
function activityCard(name,r,e){const p=e?((r-e)/e*100):0;return `<div class="card section"><div class="section-head"><h2>${name}</h2><span>${r?moneyFC(r):"Pas encore de recette"}</span></div><div class="metric-row"><span>Dépenses</span><strong>${moneyFC(e)}</strong></div><div class="metric-row"><span>Recettes</span><strong>${moneyFC(r)}</strong></div><div class="metric-row"><span>Résultat</span><strong class="${r-e<0?"negative":"positive"}">${moneyFC(r-e)}</strong></div></div>`}
function monthlyChart(){
 const arr=state.monthly||[]; const max=Math.max(1,...arr.map(x=>Math.max(Number(x.expenses)||0,Number(x.sales)||0)));
 return `<div class="mini-chart">${arr.map(x=>`<div class="bar-col"><div class="bar-stack"><i class="expense" style="height:${(x.expenses/max*100)}%"></i><i class="sales" style="height:${(x.sales/max*100)}%"></i></div><small>${esc(x.month.slice(0,3))}</small></div>`).join("")}</div>`;
}
function fundingPage(){
 return `<div class="page-actions"><div class="hint">${state.funding.length} mouvements de financement</div><div class="action-group">${exportButtons("funding","Financements")}<button class="primary-btn" onclick="fundingForm()">＋ Ajouter un financement</button></div></div>
 <div class="grid kpis"><div class="card kpi green"><div class="label">USD</div><div class="value">${moneyUSD(total(state.funding,"usd"))}</div></div><div class="card kpi"><div class="label">FC</div>${dualFC(total(state.funding,"fc"))}</div><div class="card kpi"><div class="label">ÉQUIVALENT TOTAL</div>${dualFC(fundingFC())}</div><div class="card kpi"><div class="label">MOUVEMENTS</div><div class="value">${state.funding.length}</div></div></div>
 <div class="card table-card"><div class="table-tools"><input class="search" id="tableSearch" placeholder="Rechercher une affectation, date ou mode…"></div>${fundingTable()}</div>`;
}
function fundingTable(){
 return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Mode</th><th class="num">USD</th><th class="num">FC</th><th>Note / affectation</th><th></th></tr></thead><tbody>${state.funding.map((x,i)=>`<tr><td>${esc(x.date)}</td><td>${esc(x.mode)}</td><td class="num">${moneyUSD(x.usd)}</td><td class="num">${moneyFC(x.fc)}</td><td>${esc(x.note)}</td><td class="row-actions"><button onclick="deleteItem('funding',${i})">Supprimer</button></td></tr>`).join("")}</tbody></table></div>`;
}
function expensesPage(){
 return `<div class="page-actions"><div class="hint">${state.expenses.length} dépenses documentées</div><div class="action-group">${exportButtons("expenses","Depenses")}<button class="primary-btn" onclick="expenseForm()">＋ Enregistrer une dépense</button></div></div>
 <div class="grid kpis"><div class="card kpi"><div class="label">TOTAL FC</div>${dualFC(total(state.expenses,"fc")+payrollPaidFC())}</div><div class="card kpi"><div class="label">TOTAL USD</div><div class="value">${moneyUSD(total(state.expenses,"usd"))}</div></div><div class="card kpi amber"><div class="label">ÉQUIVALENT</div>${dualFC(expenseFC())}</div><div class="card kpi"><div class="label">OPÉRATIONS</div><div class="value">${state.expenses.length}</div></div></div>
 <div class="card table-card"><div class="table-tools"><input class="search" id="tableSearch" placeholder="Rechercher une dépense…"><select class="filter" id="sectorFilter"><option value="">Tous les secteurs</option>${[...new Set(state.expenses.map(x=>x.sector))].map(s=>`<option>${esc(s)}</option>`).join("")}</select></div>${expenseTable()}</div>`;
}
function expenseTable(){
 const normal=state.expenses.map((x,i)=>`<tr><td>${esc(x.date)}</td><td><span class="pill ${x.sector==="Tomates"?"done":"todo"}">${esc(x.sector)}</span></td><td>${esc(x.description)}</td><td class="num">${moneyUSD(x.usd)}</td><td class="num">${moneyFC(x.fc)}</td><td class="row-actions"><button onclick="deleteItem('expenses',${i})">Supprimer</button></td></tr>`).join("");
 const payroll=(state.payrollPayments||[]).filter(p=>p.status==="Payé").map(p=>{const w=workerById(p.workerId);return `<tr><td>${esc(p.paidDate)}</td><td><span class="pill done">Paie</span></td><td>Salaire ${esc(w.name)} — ${esc(p.period)}</td><td class="num">${moneyUSD(p.usd)}</td><td class="num">${moneyFC(p.fc)}</td><td class="row-actions"><button onclick="payrollSlip('${p.id}')">Bulletin</button></td></tr>`}).join("");
 return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Secteur</th><th>Description</th><th class="num">USD</th><th class="num">FC</th><th></th></tr></thead><tbody>${normal}${payroll}</tbody></table></div>`;
}
function quotesPage(){
 const planned=total(state.quotes,"planned"),spent=total(state.quotes,"spent"),todo=state.quotes.filter(x=>!String(x.status).toLowerCase().includes("réalis")).length;
 return `<div class="page-actions"><div class="hint">Base issue du devis technique de 84 articles</div><div class="action-group">${exportButtons("quotes","Devis_Activites")}<button class="primary-btn" onclick="quoteForm()">＋ Ajouter un article</button></div></div>
 <div class="grid kpis"><div class="card kpi"><div class="label">ARTICLES</div><div class="value">${state.quotes.length}</div></div><div class="card kpi green"><div class="label">RÉALISÉS</div><div class="value">${state.quotes.length-todo}</div></div><div class="card kpi amber"><div class="label">BUDGET PRÉVU</div><div class="value">${moneyFC(planned)}</div></div><div class="card kpi"><div class="label">RESTE À PAYER</div><div class="value">${moneyFC(planned-spent)}</div></div></div>
 <div class="card table-card"><div class="table-tools"><input class="search" id="tableSearch" placeholder="Rechercher un article…"><select class="filter" id="statusFilter"><option value="">Tous les statuts</option><option>Réalisé</option><option>Non réalisé</option></select></div><div class="table-wrap"><table class="data-table"><thead><tr><th>N°</th><th>Désignation</th><th>Secteur</th><th>Statut</th><th class="num">Prévu FC</th><th class="num">Dépensé FC</th><th class="num">Reste FC</th><th></th></tr></thead><tbody>${state.quotes.map((x,i)=>`<tr><td>${x.id||i+1}</td><td><b>${esc(x.name)}</b></td><td>${esc(x.sector)}</td><td><span class="pill ${String(x.status).toLowerCase().includes("réalis")?"done":"todo"}">${esc(x.status)}</span></td><td class="num">${moneyFC(x.planned)}</td><td class="num">${moneyFC(x.spent)}</td><td class="num">${moneyFC((Number(x.planned)||0)-(Number(x.spent)||0))}</td><td class="row-actions"><button onclick="editQuote(${i})">Modifier</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function salesPage(){
 return `<div class="page-actions"><div class="hint">${state.sales.length} lignes de recettes</div><div class="action-group">${exportButtons("sales","Recettes_Ventes")}<button class="primary-btn" onclick="saleForm()">＋ Ajouter une recette</button></div></div>
 <div class="grid kpis"><div class="card kpi green"><div class="label">RECETTES TOTALES</div>${dualFC(salesFC())}</div><div class="card kpi"><div class="label">TOMATES</div>${dualFC(total(state.sales.filter(x=>x.project==="Tomates"),"fc"))}</div><div class="card kpi"><div class="label">POULES</div>${dualFC(total(state.sales.filter(x=>x.project==="Poules"),"fc"))}</div><div class="card kpi"><div class="label">LIGNES</div><div class="value">${state.sales.length}</div></div></div>
 <div class="card table-card"><div class="table-tools"><input class="search" id="tableSearch" placeholder="Rechercher une vente…"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Projet</th><th>Description</th><th>Quantité</th><th class="num">Recette FC</th><th></th></tr></thead><tbody>${state.sales.map((x,i)=>`<tr><td>${esc(x.date)}</td><td>${esc(x.project)}</td><td>${esc(x.description)}</td><td>${esc(x.quantity)}</td><td class="num">${moneyFC(x.fc)}</td><td class="row-actions"><button onclick="deleteItem('sales',${i})">Supprimer</button></td></tr>`).join("")}</tbody></table></div></div>`;
}

function materialsPage(){
 const totalValue=state.materials.reduce((a,m)=>a+(Number(m.qty)||0)*(Number(m.unitCostFC)||0),0);
 return `<div class="page-actions"><div class="hint">${state.materials.length} matériels enregistrés · valeur d’inventaire ${moneyFC(totalValue)}</div><div class="action-group"><button class="secondary-btn" onclick="exportMaterialsCSV()">CSV</button><button class="secondary-btn" onclick="exportMaterialsExcel()">Excel</button><button class="primary-btn" onclick="materialForm()">＋ Enregistrer un matériel</button></div></div>
 <div class="grid kpis"><div class="card kpi green"><div class="label">MATÉRIELS</div><div class="value">${state.materials.length}</div><div class="sub">Articles suivis</div></div><div class="card kpi blue-card"><div class="label">VALEUR INVENTAIRE</div>${dualFC(totalValue)}<div class="sub">Valeur déclarée en FC</div></div><div class="card kpi amber"><div class="label">EN SERVICE</div><div class="value">${state.materials.filter(m=>m.status==="En service").length}</div><div class="sub">Matériels opérationnels</div></div><div class="card kpi purple-card"><div class="label">ENTREPOSÉS</div><div class="value">${state.materials.filter(m=>m.status==="Entreposé").length}</div><div class="sub">Matériels en réserve</div></div></div>
 <div class="card table-card"><div class="table-tools"><input class="search" id="tableSearch" placeholder="Rechercher un matériel, catégorie ou emplacement…"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Matériel</th><th>Catégorie</th><th class="num">Qté</th><th>Unité</th><th class="num">Coût unitaire</th><th>Emplacement</th><th>État</th><th>Statut</th><th></th></tr></thead><tbody>${state.materials.map((m,i)=>`<tr><td><b>${esc(m.name)}</b><div class="muted">${esc(m.date||"")}</div></td><td>${esc(m.category)}</td><td class="num">${Number(m.qty)||0}</td><td>${esc(m.unit||"")}</td><td class="num">${dualFC(m.unitCostFC||0)}</td><td>${esc(m.location||"")}</td><td>${esc(m.condition||"")}</td><td><span class="pill ${m.status==="En service"?"done":"todo"}">${esc(m.status||"")}</span></td><td class="row-actions"><button onclick="materialForm(${i})">Modifier</button><button onclick="deleteItem('materials',${i})">Supprimer</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function materialForm(i){
 const m=i==null?{name:"",category:"Irrigation",qty:1,unit:"unité",unitCostFC:0,location:"Ferme Kambikila",condition:"Bon",status:"En service",date:"05/10/2026",note:""}:state.materials[i];
 openModal(i==null?"Enregistrer un matériel":"Modifier le matériel",`<form id="materialForm" class="form-grid"><div class="field full"><label>NOM DU MATÉRIEL</label><input name="name" required value="${esc(m.name)}"></div><div class="field"><label>CATÉGORIE</label><input name="category" value="${esc(m.category)}" placeholder="Irrigation, outils…"></div><div class="field"><label>QUANTITÉ</label><input name="qty" type="number" min="0" step="0.01" value="${m.qty||0}"></div><div class="field"><label>UNITÉ</label><input name="unit" value="${esc(m.unit)}" placeholder="unité, sac, pièce…"></div><div class="field"><label>COÛT UNITAIRE (FC)</label><input name="unitCostFC" type="number" min="0" value="${m.unitCostFC||0}"></div><div class="field"><label>EMPLACEMENT</label><input name="location" value="${esc(m.location)}"></div><div class="field"><label>ÉTAT</label><select name="condition"><option ${m.condition==="Neuf"?"selected":""}>Neuf</option><option ${m.condition==="Bon"?"selected":""}>Bon</option><option ${m.condition==="À réparer"?"selected":""}>À réparer</option><option ${m.condition==="Hors service"?"selected":""}>Hors service</option></select></div><div class="field"><label>STATUT</label><select name="status"><option ${m.status==="En service"?"selected":""}>En service</option><option ${m.status==="Entreposé"?"selected":""}>Entreposé</option><option ${m.status==="À réparer"?"selected":""}>À réparer</option></select></div><div class="field"><label>DATE D’ENREGISTREMENT</label><input name="date" value="${esc(m.date)}"></div><div class="field full"><label>NOTE</label><textarea name="note">${esc(m.note||"")}</textarea></div><div class="modal-actions full"><button type="button" class="secondary-btn" onclick="closeModal()">Annuler</button><button class="primary-btn">Enregistrer</button></div></form>`);
 document.getElementById("materialForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const obj={id:i==null?"mat-"+Date.now():state.materials[i].id,name:f.get("name"),category:f.get("category"),qty:Number(f.get("qty"))||0,unit:f.get("unit"),unitCostFC:Number(f.get("unitCostFC"))||0,location:f.get("location"),condition:f.get("condition"),status:f.get("status"),date:f.get("date"),note:f.get("note")};if(i==null)state.materials.push(obj);else state.materials[i]=obj;save();closeModal();render();toast("Matériel enregistré");};
}
function exportMaterialsCSV(){const rows=[["Matériel","Catégorie","Quantité","Unité","Coût unitaire FC","Valeur FC","Emplacement","État","Statut","Date","Note"]];state.materials.forEach(m=>rows.push([m.name,m.category,m.qty,m.unit,m.unitCostFC,(Number(m.qty)||0)*(Number(m.unitCostFC)||0),m.location,m.condition,m.status,m.date,m.note]));downloadRows(rows,"Kambikila_Materiels.csv");}
function exportMaterialsExcel(){const rows=[["Matériel","Catégorie","Quantité","Unité","Coût unitaire FC","Valeur FC","Emplacement","État","Statut","Date","Note"]];state.materials.forEach(m=>rows.push([m.name,m.category,m.qty,m.unit,m.unitCostFC,(Number(m.qty)||0)*(Number(m.unitCostFC)||0),m.location,m.condition,m.status,m.date,m.note]));if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,"Matériels");XLSX.writeFile(wb,"Kambikila_Materiels.xlsx");toast("Excel matériels généré");}else downloadRows(rows,"Kambikila_Materiels.csv");}

function workerById(id){return (state.workers||[]).find(w=>w.id===id)||{name:"Inconnu",role:"",salaryFC:0,salaryUSD:0,startDate:"",payDay:5,lodging:false};}
function workerSalaryLabel(w){return w.salaryUSD?moneyUSD(w.salaryUSD)+" / mois" : moneyFC(w.salaryFC)+" / mois";}
function workersPage(){
 const due=(state.payrollPayments||[]).filter(x=>x.status!=="Payé").length;
 return `<div class="page-actions"><div class="hint">${state.workers.length} travailleurs · début de contrat au 01/09/2026 · paie le 5 de chaque mois</div><div class="action-group"><button class="secondary-btn" onclick="exportPayrollCSV()">CSV paie</button><button class="secondary-btn" onclick="exportPayrollExcel()">Excel paie</button><button class="primary-btn" onclick="workerForm()">＋ Ajouter un travailleur</button></div></div>
 <div class="grid kpis"><div class="card kpi green"><div class="label">MASSE SALARIALE / MOIS</div><div class="value">${moneyFC(monthlyPayrollFC())}</div><div class="sub">Équivalent FC au taux ${moneyFC(state.settings.exchangeRate)} / USD</div></div><div class="card kpi amber"><div class="label">SALAIRES À PAYER</div><div class="value">${moneyFC(payrollDueFC())}</div><div class="sub">${due} bulletin(s) en attente</div></div><div class="card kpi"><div class="label">SALAIRES PAYÉS</div><div class="value">${moneyFC(payrollPaidFC())}</div><div class="sub">Entrent dans les dépenses après paiement</div></div><div class="card kpi"><div class="label">DATE DE PAIE</div><div class="value">05</div><div class="sub">Chaque mois</div></div></div>
 <div class="card table-card"><div class="section section-head"><div><h2>Équipe de la ferme</h2><div class="muted" style="font-size:10px;margin-top:4px">Logement à la ferme indiqué pour Patrick et Martin.</div></div><span>Actifs</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Travailleur</th><th>Fonction</th><th>Début</th><th>Logement</th><th class="num">Salaire</th><th>Prochaine paie</th><th></th></tr></thead><tbody>${state.workers.map((w,i)=>`<tr><td><b>${esc(w.name)}</b></td><td>${esc(w.role)}</td><td>${esc(w.startDate)}</td><td>${w.lodging?'<span class="pill done">À la ferme</span>':'<span class="pill todo">Non</span>'}</td><td class="num">${workerSalaryLabel(w)}</td><td>05/10/2026</td><td class="row-actions"><button onclick="workerForm(${i})">Modifier</button></td></tr>`).join("")}</tbody></table></div></div>
 <div class="card section" style="margin-top:16px"><div class="section-head"><h2>Paie de septembre 2026</h2><span>Échéance : 05/10/2026</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Travailleur</th><th>Fonction</th><th>Période</th><th class="num">Montant</th><th>Statut</th><th>Date paiement</th><th></th></tr></thead><tbody>${state.payrollPayments.map((p,i)=>{const w=workerById(p.workerId);return `<tr><td><b>${esc(w.name)}</b></td><td>${esc(w.role)}</td><td>${esc(p.period)}</td><td class="num">${p.usd?moneyUSD(p.usd)+" · "+moneyFC(p.fc):moneyFC(p.fc)}</td><td><span class="pill ${p.status==="Payé"?"done":"warn"}">${esc(p.status)}</span></td><td>${esc(p.paidDate||"—")}</td><td class="row-actions">${p.status==="Payé"?`<button onclick="payrollSlip('${p.id}')">Bulletin</button>`:`<button class="pay-btn" onclick="payPayroll('${p.id}')">Payer</button>`}</td></tr>`}).join("")}</tbody></table></div></div>`;
}
function workerForm(i){
 const w=i==null?{name:"",role:"Tous travaux",salaryFC:200000,salaryUSD:0,startDate:"01/09/2026",payDay:5,lodging:true,status:"Actif"}:state.workers[i];
 openModal(i==null?"Ajouter un travailleur":"Modifier le travailleur",`<form id="workerForm" class="form-grid"><div class="field"><label>NOM</label><input name="name" required value="${esc(w.name)}"></div><div class="field"><label>FONCTION</label><input name="role" required value="${esc(w.role)}"></div><div class="field"><label>DATE DE DÉBUT</label><input name="startDate" value="${esc(w.startDate)}"></div><div class="field"><label>JOUR DE PAIE</label><input name="payDay" type="number" min="1" max="28" value="${w.payDay||5}"></div><div class="field"><label>SALAIRE FC / MOIS</label><input name="salaryFC" type="number" min="0" value="${w.salaryFC||0}"></div><div class="field"><label>SALAIRE USD / MOIS</label><input name="salaryUSD" type="number" min="0" step="0.01" value="${w.salaryUSD||0}"></div><div class="field"><label>LOGÉ À LA FERME</label><select name="lodging"><option value="true" ${w.lodging?"selected":""}>Oui</option><option value="false" ${!w.lodging?"selected":""}>Non</option></select></div><div class="field"><label>STATUT</label><select name="status"><option ${w.status==="Actif"?"selected":""}>Actif</option><option ${w.status!=="Actif"?"selected":""}>Inactif</option></select></div><div class="modal-actions full"><button type="button" class="secondary-btn" onclick="closeModal()">Annuler</button><button class="primary-btn">Enregistrer</button></div></form>`);
 document.getElementById("workerForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const obj={id:i==null?("worker-"+Date.now()):state.workers[i].id,name:f.get("name"),role:f.get("role"),salaryFC:Number(f.get("salaryFC"))||0,salaryUSD:Number(f.get("salaryUSD"))||0,startDate:f.get("startDate"),payDay:Number(f.get("payDay"))||5,lodging:f.get("lodging")==="true",status:f.get("status")};if(i==null)state.workers.push(obj);else state.workers[i]=obj;save();closeModal();render();toast("Travailleur enregistré");};
}
function payPayroll(id){
 const p=state.payrollPayments.find(x=>x.id===id); if(!p)return; const w=workerById(p.workerId);
 openModal("Valider le paiement",`<div class="notice"><b>${esc(w.name)}</b> — ${esc(p.period)}<br>Montant : <strong>${p.usd?moneyUSD(p.usd)+" · "+moneyFC(p.fc):moneyFC(p.fc)}</strong><br>Ce paiement sera automatiquement intégré aux dépenses.</div><form id="payForm" class="form-grid"><div class="field"><label>DATE DE PAIEMENT</label><input name="paidDate" value="05/10/2026" required></div><div class="field"><label>MODE DE PAIEMENT</label><select name="method"><option>M-Pesa</option><option>Espèces</option><option>Virement</option></select></div><div class="field full"><label>NOTE</label><textarea name="note" placeholder="Ex. salaire septembre"></textarea></div><div class="modal-actions full"><button type="button" class="secondary-btn" onclick="closeModal()">Annuler</button><button class="primary-btn">Confirmer le paiement</button></div></form>`);
 document.getElementById("payForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);p.status="Payé";p.paidDate=f.get("paidDate");p.method=f.get("method");p.note=f.get("note")||"Salaire "+p.period;save();closeModal();render();toast("Salaire payé et comptabilisé");};
}
function payrollSlip(id){
 const p=state.payrollPayments.find(x=>x.id===id);if(!p)return;const w=workerById(p.workerId);const rate=state.settings.exchangeRate;
 if(window.pdfMake){
  const details=[["Salaire mensuel",p.usd?moneyUSD(p.usd):moneyFC(p.fc)],["Équivalent FC",moneyFC(p.fc)],["Taux de change",moneyFC(rate)+" / USD"],["Logement",w.lodging?"À la ferme":"Non"]];
  pdfMake.createPdf({pageSize:"A4",content:[
   {text:"FERME KAMBIKILA",style:"brand"},{text:"BULLETIN DE PAIE",style:"title"},{text:"Période : "+p.period,style:"period"},
   {canvas:[{type:"line",x1:0,y1:0,x2:515,y2:0,lineWidth:1}]},
   {columns:[{text:[{text:"Travailleur\n",bold:true},w.name+"\n",w.role]},{text:[{text:"Date de début\n",bold:true},w.startDate+"\n",{text:"Date de paiement\n",bold:true},p.paidDate||"—"]}]},
   {text:"DÉTAIL DE LA RÉMUNÉRATION",style:"section"},{table:{widths:["*","auto"],body:details}},
   {text:"STATUT : PAYÉ",style:"paid"},{text:"Mode de paiement : "+(p.method||"—"),margin:[0,12,0,0]},
   {text:"Signature du responsable : ____________________    Signature du travailleur : ____________________",margin:[0,55,0,0],fontSize:9}
  ],styles:{brand:{fontSize:12,bold:true,color:"#16784a"},title:{fontSize:22,bold:true,margin:[0,8,0,3]},period:{fontSize:11,color:"#6b776f",margin:[0,0,0,18]},section:{fontSize:12,bold:true,margin:[0,22,0,8]},paid:{fontSize:12,bold:true,color:"#16784a",margin:[0,18,0,0]}}}).download("Bulletin_Paie_"+w.name+"_"+p.period.replaceAll(" ","_")+".pdf");
 }else{window.print();}
}
function exportPayrollCSV(){const rows=[["Travailleur","Fonction","Période","Montant FC","Montant USD","Échéance","Statut","Date paiement","Mode"]];state.payrollPayments.forEach(p=>{const w=workerById(p.workerId);rows.push([w.name,w.role,p.period,p.fc,p.usd,p.dueDate,p.status,p.paidDate,p.method])});downloadRows(rows,"Kambikila_Paie.csv");}
function exportPayrollExcel(){const rows=[["Travailleur","Fonction","Période","Montant FC","Montant USD","Échéance","Statut","Date paiement","Mode"]];state.payrollPayments.forEach(p=>{const w=workerById(p.workerId);rows.push([w.name,w.role,p.period,p.fc,p.usd,p.dueDate,p.status,p.paidDate,p.method])});if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,"Paie");XLSX.writeFile(wb,"Kambikila_Paie.xlsx");toast("Excel paie généré");}else downloadRows(rows,"Kambikila_Paie.csv");}
function downloadRows(rows,name){const csv="\uFEFF"+rows.map(r=>r.map(csvEscape).join(";")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Export généré");}

function settingsPage(){
 return `<div class="grid two"><div class="card section"><div class="section-head"><h2>Identité & apparence</h2><span>Personnalisez votre ferme</span></div><div class="branding-preview"><img id="logoPreview" src="${esc(state.settings.branding?.logo||"assets/kambikila-logo.png")}"><div><b>${esc(state.settings.projectName||"Ferme Kambikila")}</b><small>Logo et image de fond personnalisables</small></div></div><div class="form-grid"><div class="field"><label>LOGO</label><input id="logoUpload" type="file" accept="image/*"></div><div class="field"><label>PHOTO DE FOND</label><input id="bgUpload" type="file" accept="image/*"></div><div class="field"><button class="secondary-btn" type="button" onclick="resetBranding()">Restaurer l’apparence par défaut</button></div></div></div>
 <div class="card section"><div class="section-head"><h2>Paramètres financiers</h2><span>repris du fichier Excel</span></div><form id="settingsForm" class="form-grid"><div class="field"><label>TAUX DE CHANGE (FC / USD)</label><input name="exchangeRate" type="number" min="1" value="${state.settings.exchangeRate}"></div><div class="field"><label>MARGE DE SÉCURITÉ (%)</label><input name="safetyMargin" type="number" min="0" value="${state.settings.safetyMargin}"></div><div class="field full"><label>NOM DU PROJET</label><input name="projectName" value="${esc(state.settings.projectName)}"></div><div class="field full"><button class="primary-btn">Enregistrer les paramètres</button></div></form></div>
 <div class="card section"><div class="section-head"><h2>Stockage des données</h2></div><p class="muted" style="font-size:11px;line-height:1.6">Cette application fonctionne sans serveur et sans base de données. Les données, le logo et la photo de fond sont conservés localement dans ce navigateur.</p><button class="secondary-btn" onclick="resetData()">Réinitialiser avec les données Excel</button></div></div>`;
}
function resetBranding(){state.settings.branding={logo:"assets/kambikila-logo.png",background:"assets/farm-background.jpg"};save();applyBranding();render();toast("Apparence restaurée");}
function brandingUpload(){const l=document.getElementById("logoUpload"),b=document.getElementById("bgUpload");if(l)l.onchange=()=>readImage(l.files[0],data=>{state.settings.branding.logo=data;save();applyBranding();render();toast("Logo changé")});if(b)b.onchange=()=>readImage(b.files[0],data=>{state.settings.branding.background=data;save();applyBranding();render();toast("Photo de fond changée")});}

function wirePage(){
 const s=document.getElementById("tableSearch"); if(s)s.addEventListener("input",()=>filterTables());
 const sf=document.getElementById("sectorFilter"); if(sf)sf.addEventListener("change",()=>filterTables());
 const st=document.getElementById("statusFilter"); if(st)st.addEventListener("change",()=>filterTables());
 brandingUpload();
 const form=document.getElementById("settingsForm"); if(form)form.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(form);state.settings.exchangeRate=Number(f.get("exchangeRate"))||2850;state.settings.safetyMargin=Number(f.get("safetyMargin"))||0;state.settings.projectName=f.get("projectName")||"Projet Kambikila";save();render();toast("Paramètres enregistrés");});
}
function filterTables(){
 const q=(document.getElementById("tableSearch")?.value||"").toLowerCase(), sec=document.getElementById("sectorFilter")?.value||"", st=document.getElementById("statusFilter")?.value||"";
 document.querySelectorAll(".data-table tbody tr").forEach(tr=>{const okQ=!q||tr.textContent.toLowerCase().includes(q);const okS=!sec||tr.textContent.includes(sec);const okSt=!st||tr.textContent.includes(st);tr.style.display=okQ&&okS&&okSt?"":"none"});
}
function quickAdd(){openModal("Nouvelle opération",`<div class="grid three"><button class="primary-btn" onclick="closeModal();fundingForm()">Financement</button><button class="primary-btn" onclick="closeModal();expenseForm()">Dépense</button><button class="primary-btn" onclick="closeModal();saleForm()">Recette</button><button class="primary-btn" onclick="closeModal();materialForm()">Matériel</button></div>`)}
function fundingForm(){
 openModal("Ajouter un financement",`<form id="fundForm" class="form-grid">
 <div class="field"><label>DATE / RÉFÉRENCE</label><input name="date" required placeholder="05/10/2026"></div><div class="field"><label>MODE D’ENVOI</label><input name="mode" placeholder="M-Pesa FC, Cash…"></div>
 <div class="field"><label>MONTANT USD</label><input name="usd" type="number" step="0.01" value="0"></div><div class="field"><label>MONTANT FC</label><input name="fc" type="number" step="1" value="0"></div>
 <div class="field full"><label>AFFECTATION / NOTE</label><textarea name="note"></textarea></div>
 <div class="modal-actions full"><button type="button" class="secondary-btn" onclick="closeModal()">Annuler</button><button class="primary-btn">Enregistrer</button></div></form>`);
 document.getElementById("fundForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.funding.push({date:f.get("date"),mode:f.get("mode"),usd:Number(f.get("usd"))||0,fc:Number(f.get("fc"))||0,note:f.get("note")});save();closeModal();render();toast("Financement ajouté");}
}
function expenseForm(){
 openModal("Enregistrer une dépense",`<form id="expForm" class="form-grid">
 <div class="field"><label>DATE / RÉFÉRENCE</label><input name="date" required placeholder="05/10/2026"></div><div class="field"><label>SECTEUR</label><input name="sector" list="sectorList" required placeholder="Tomates"><datalist id="sectorList">${[...new Set(state.expenses.map(x=>x.sector))].map(x=>`<option>${esc(x)}</option>`).join("")}</datalist></div>
 <div class="field full"><label>DESCRIPTION DE L’ACTIVITÉ</label><textarea name="description" required></textarea></div><div class="field"><label>MONTANT USD</label><input name="usd" type="number" step=".01" value="0"></div><div class="field"><label>MONTANT FC</label><input name="fc" type="number" step="1" value="0"></div>
 <div class="modal-actions full"><button type="button" class="secondary-btn" onclick="closeModal()">Annuler</button><button class="primary-btn">Enregistrer</button></div></form>`);
 document.getElementById("expForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.expenses.push({date:f.get("date"),sector:f.get("sector"),description:f.get("description"),usd:Number(f.get("usd"))||0,fc:Number(f.get("fc"))||0});save();closeModal();render();toast("Dépense enregistrée");}
}
function saleForm(){
 openModal("Ajouter une recette / vente",`<form id="saleForm" class="form-grid">
 <div class="field"><label>DATE</label><input name="date" required placeholder="05/10/2026"></div><div class="field"><label>PROJET</label><input name="project" list="projectList" required><datalist id="projectList"><option>Tomates</option><option>Poules</option></datalist></div>
 <div class="field full"><label>DESCRIPTION VENTE</label><textarea name="description" required></textarea></div><div class="field"><label>QUANTITÉ</label><input name="quantity" placeholder="Casiers, sujets…"></div><div class="field"><label>RECETTE NETTE (FC)</label><input name="fc" type="number" step="1" value="0"></div>
 <div class="modal-actions full"><button type="button" class="secondary-btn" onclick="closeModal()">Annuler</button><button class="primary-btn">Enregistrer</button></div></form>`);
 document.getElementById("saleForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.sales.push({date:f.get("date"),project:f.get("project"),description:f.get("description"),quantity:f.get("quantity"),fc:Number(f.get("fc"))||0});save();closeModal();render();toast("Recette ajoutée");}
}
function quoteForm(){editQuote(null)}
function editQuote(i){
 const x=i===null?{id:state.quotes.length+1,name:"",sector:"Tomates",status:"Non réalisé",planned:0,spent:0}:state.quotes[i];
 openModal(i===null?"Ajouter un article":"Modifier l’article",`<form id="quoteForm" class="form-grid">
 <div class="field"><label>N°</label><input name="id" type="number" value="${x.id||""}"></div><div class="field"><label>SECTEUR</label><input name="sector" value="${esc(x.sector)}"></div>
 <div class="field full"><label>DÉSIGNATION</label><input name="name" required value="${esc(x.name)}"></div><div class="field"><label>STATUT</label><select name="status"><option ${x.status==="Réalisé"?"selected":""}>Réalisé</option><option ${x.status!=="Réalisé"?"selected":""}>Non réalisé</option></select></div>
 <div class="field"><label>COÛT PRÉVU (FC)</label><input name="planned" type="number" value="${x.planned||0}"></div><div class="field"><label>DÉPENSÉ (FC)</label><input name="spent" type="number" value="${x.spent||0}"></div>
 <div class="modal-actions full"><button type="button" class="secondary-btn" onclick="closeModal()">Annuler</button><button class="primary-btn">Enregistrer</button></div></form>`);
 document.getElementById("quoteForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const obj={id:Number(f.get("id"))||state.quotes.length+1,name:f.get("name"),sector:f.get("sector"),status:f.get("status"),planned:Number(f.get("planned"))||0,spent:Number(f.get("spent"))||0};if(i===null)state.quotes.push(obj);else state.quotes[i]=obj;save();closeModal();render();toast("Devis mis à jour");}
}
function deleteItem(type,i){if(confirm("Supprimer définitivement cette ligne ?")){state[type].splice(i,1);save();render();toast("Ligne supprimée")}}
function resetData(){if(confirm("Revenir exactement aux données initiales du fichier Excel ? Les nouvelles saisies locales seront perdues.")){state=normalizeState(window.KAMBIKILA_INITIAL_DATA);save();render();toast("Données initiales restaurées")}}
document.getElementById("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kambikila-sauvegarde.json";a.click();URL.revokeObjectURL(a.href);toast("Sauvegarde exportée")};
document.getElementById("importInput").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.funding||!d.expenses||!d.quotes||!d.sales)throw Error();state=normalizeState(d);save();render();toast("Sauvegarde importée")}catch(err){alert("Fichier de sauvegarde invalide.")}};r.readAsText(file)};
render();
