// ============================================================
//  AL JAMEA TUS SAIFIYAH — QUIZ PLATFORM v3
//  Google Apps Script Backend (Code.gs)
//  Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = {
      'Users':   ['id','username','password','role','name','email','class','subject','createdAt'],
      'Classes': ['id','name','description','createdAt'],
      'Tests':   ['id','title','subject','class','instructions','questions','timeLimit','createdBy','createdAt','active','shuffle','shuffleOptions','oneAttempt','arabicFont','showReview'],
      'Results': ['id','studentId','studentName','studentEmail','testId','testTitle','subject','class','score','total','pct','answers','submittedAt','status','manualScores'],
    };
    if (headers[name]) sheet.appendRow(headers[name]);
  }
  return sheet;
}

function doGet(e) { return HtmlService.createHtmlOutput('AJTS Quiz Platform API v3 Running'); }

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const handlers = {
      login,
      getTests, saveTest, deleteTest, toggleTestActive, duplicateTest,
      submitResult, getResults, deleteResult: deleteResultById,
      updateManualScore, getPendingReviews,
      getUsers, saveUser, deleteUser, bulkSaveUsers,
      getClasses, saveClass, deleteClass,
      sendResultEmail, sendMarksheetEmail,
      getStudentReport, getStudentProfile,
      checkAttempt,
    };
    const fn = handlers[data.action];
    const result = fn ? fn(data) : { success: false, error: 'Unknown action: ' + data.action };
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function login(data) {
  const sheet = getSheet('Users');
  const rows = sheet.getDataRange().getValues();
  const u = String(data.username||'').trim().toLowerCase();
  const p = String(data.password||'').trim();
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (String(rows[i][1]).trim().toLowerCase()===u && String(rows[i][2]).trim()===p) {
      return { success:true, user:{ id:rows[i][0], username:rows[i][1], role:String(rows[i][3]).trim(), name:rows[i][4], email:rows[i][5], class:rows[i][6], subject:rows[i][7] }};
    }
  }
  return { success:false, error:'Invalid username or password' };
}

function getClasses() {
  const sheet = getSheet('Classes');
  const rows = sheet.getDataRange().getValues();
  const classes = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) classes.push({ id:rows[i][0], name:rows[i][1], description:rows[i][2], createdAt:rows[i][3] });
  }
  return { success:true, classes };
}

function saveClass(data) {
  const sheet = getSheet('Classes');
  const c = data.class;
  const rows = sheet.getDataRange().getValues();
  if (c.id) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]===c.id) { sheet.getRange(i+1,1,1,4).setValues([[c.id,c.name,c.description||'',rows[i][3]]]); return {success:true}; }
    }
  }
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim().toLowerCase()===String(c.name).trim().toLowerCase()) return {success:false,error:'Class already exists'};
  }
  const id = Utilities.getUuid();
  sheet.appendRow([id,c.name,c.description||'',new Date().toISOString()]);
  return {success:true,id};
}

function deleteClass(data) {
  const sheet = getSheet('Classes');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) { if (rows[i][0]===data.id) { sheet.deleteRow(i+1); return {success:true}; } }
  return {success:false};
}

function parseTest(row) {
  return {
    id:row[0],title:row[1],subject:row[2],class:row[3],instructions:row[4],
    questions:JSON.parse(row[5]||'[]'),timeLimit:row[6]||0,createdBy:row[7],createdAt:row[8],
    active:row[9]===true||row[9]==='true',
    shuffle:row[10]===true||row[10]==='true',
    shuffleOptions:row[11]===true||row[11]==='true',
    oneAttempt:row[12]===true||row[12]==='true',
    arabicFont:row[13]||'Amiri',
    showReview:row[14]===true||row[14]==='true',
  };
}

function getTests(data) {
  const sheet = getSheet('Tests');
  const rows = sheet.getDataRange().getValues();
  const tests = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const t = parseTest(rows[i]);
    if (data.class && t.class!==data.class && t.class!=='All Classes') continue;
    if (data.activeOnly && !t.active) continue;
    tests.push(t);
  }
  return {success:true,tests};
}

function saveTest(data) {
  const sheet = getSheet('Tests');
  const t = data.test;
  t.active = t.active!==false;
  const row = [t.id||'',t.title,t.subject,t.class,t.instructions||'',JSON.stringify(t.questions),t.timeLimit||0,t.createdBy||'',t.createdAt||new Date().toISOString(),t.active,t.shuffle||false,t.shuffleOptions||false,t.oneAttempt||false,t.arabicFont||'Amiri',t.showReview||false];
  if (t.id) {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]===t.id) { sheet.getRange(i+1,1,1,15).setValues([row]); return {success:true}; }
    }
  }
  row[0] = Utilities.getUuid(); row[8] = new Date().toISOString();
  sheet.appendRow(row);
  return {success:true,id:row[0]};
}

function deleteTest(data) {
  const sheet = getSheet('Tests');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) { if (rows[i][0]===data.id) { sheet.deleteRow(i+1); return {success:true}; } }
  return {success:false};
}

function toggleTestActive(data) {
  const sheet = getSheet('Tests');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]===data.id) {
      const v = !(rows[i][9]===true||rows[i][9]==='true');
      sheet.getRange(i+1,10).setValue(v);
      return {success:true,active:v};
    }
  }
  return {success:false};
}

function duplicateTest(data) {
  const sheet = getSheet('Tests');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]===data.id) {
      const t = parseTest(rows[i]);
      t.id = Utilities.getUuid(); t.title = 'Copy of '+t.title;
      t.createdAt = new Date().toISOString(); t.active = false;
      sheet.appendRow([t.id,t.title,t.subject,t.class,t.instructions,JSON.stringify(t.questions),t.timeLimit,t.createdBy,t.createdAt,false,t.shuffle,t.shuffleOptions,t.oneAttempt,t.arabicFont,t.showReview]);
      return {success:true,id:t.id};
    }
  }
  return {success:false};
}

function checkAttempt(data) {
  const sheet = getSheet('Results');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1]===data.studentId && rows[i][4]===data.testId) return {success:true,attempted:true};
  }
  return {success:true,attempted:false};
}

function submitResult(data) {
  const sheet = getSheet('Results');
  const r = data.result;
  const id = Utilities.getUuid();
  sheet.appendRow([id,r.studentId,r.studentName,r.studentEmail||'',r.testId,r.testTitle,r.subject,r.class,r.score,r.total,r.pct,JSON.stringify(r.answers),new Date().toISOString(),r.status||'complete','{}']);
  return {success:true,id};
}

function getResults(data) {
  const sheet = getSheet('Results');
  const rows = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const r = {id:rows[i][0],studentId:rows[i][1],studentName:rows[i][2],studentEmail:rows[i][3],testId:rows[i][4],testTitle:rows[i][5],subject:rows[i][6],class:rows[i][7],score:rows[i][8],total:rows[i][9],pct:Number(rows[i][10]),answers:JSON.parse(rows[i][11]||'[]'),submittedAt:rows[i][12],status:rows[i][13]||'complete',manualScores:JSON.parse(rows[i][14]||'{}')};
    if (data.class && r.class!==data.class) continue;
    if (data.subject && r.subject!==data.subject) continue;
    if (data.testId && r.testId!==data.testId) continue;
    if (data.studentId && r.studentId!==data.studentId) continue;
    if (data.status && r.status!==data.status) continue;
    results.push(r);
  }
  return {success:true,results};
}

function getPendingReviews(data) { return getResults({...data,status:'pending_review'}); }

function updateManualScore(data) {
  const sheet = getSheet('Results');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]===data.resultId) {
      sheet.getRange(i+1,9).setValue(data.finalScore);
      sheet.getRange(i+1,11).setValue(data.finalPct);
      sheet.getRange(i+1,14).setValue('complete');
      sheet.getRange(i+1,15).setValue(JSON.stringify(data.manualScores));
      return {success:true};
    }
  }
  return {success:false};
}

function deleteResultById(data) {
  const sheet = getSheet('Results');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) { if (rows[i][0]===data.id) { sheet.deleteRow(i+1); return {success:true}; } }
  return {success:false};
}

function getUsers(data) {
  const sheet = getSheet('Users');
  const rows = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const u = {id:rows[i][0],username:rows[i][1],role:rows[i][3],name:rows[i][4],email:rows[i][5],class:rows[i][6],subject:rows[i][7],createdAt:rows[i][8]};
    if (data&&data.role&&u.role!==data.role) continue;
    if (data&&data.class&&u.class!==data.class) continue;
    users.push(u);
  }
  return {success:true,users};
}

function saveUser(data) {
  const sheet = getSheet('Users');
  const u = data.user;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim().toLowerCase()===String(u.username).trim().toLowerCase()&&rows[i][0]!==u.id) return {success:false,error:'Username already exists'};
  }
  if (u.id) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]===u.id) { sheet.getRange(i+1,1,1,9).setValues([[u.id,u.username,u.password||rows[i][2],u.role,u.name,u.email||'',u.class||'',u.subject||'',rows[i][8]]]); return {success:true}; }
    }
  }
  const id = Utilities.getUuid();
  sheet.appendRow([id,u.username,u.password,u.role,u.name,u.email||'',u.class||'',u.subject||'',new Date().toISOString()]);
  return {success:true,id};
}

function bulkSaveUsers(data) {
  let created=0,skipped=0,errors=0,skippedList=[];
  for (const u of (data.users||[])) {
    const res = saveUser({user:u});
    if (res.success) created++;
    else if (res.error==='Username already exists') { skipped++; skippedList.push(u.username); }
    else errors++;
  }
  return {success:true,created,skipped,errors,skippedList};
}

function deleteUser(data) {
  const sheet = getSheet('Users');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) { if (rows[i][0]===data.id) { sheet.deleteRow(i+1); return {success:true}; } }
  return {success:false};
}

function getStudentReport(data) {
  const rows = getSheet('Results').getDataRange().getValues();
  const byStudent = {};
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const r = {studentId:rows[i][1],studentName:rows[i][2],testId:rows[i][4],testTitle:rows[i][5],subject:rows[i][6],class:rows[i][7],pct:Number(rows[i][10]),submittedAt:rows[i][12],status:rows[i][13]||'complete'};
    if (data.class&&r.class!==data.class) continue;
    if (data.subject&&r.subject!==data.subject) continue;
    if (!byStudent[r.studentId]) byStudent[r.studentId]={studentId:r.studentId,studentName:r.studentName,results:[]};
    byStudent[r.studentId].results.push(r);
  }
  const report = Object.values(byStudent).map(s=>{
    const c=s.results.filter(r=>r.status==='complete');
    const avg=c.length?Math.round(c.reduce((a,r)=>a+r.pct,0)/c.length):0;
    const best=c.reduce((a,r)=>r.pct>a.pct?r:a,c[0]||{pct:0});
    const worst=c.reduce((a,r)=>r.pct<a.pct?r:a,c[0]||{pct:100});
    const trend=c.length>=2?c[c.length-1].pct-c[0].pct:0;
    return {...s,avg,best,worst,trend,total:s.results.length};
  });
  return {success:true,report};
}

function getStudentProfile(data) {
  const rRows = getSheet('Results').getDataRange().getValues();
  const results = [];
  for (let i = 1; i < rRows.length; i++) {
    if (!rRows[i][0]||rRows[i][1]!==data.studentId) continue;
    results.push({id:rRows[i][0],testId:rRows[i][4],testTitle:rRows[i][5],subject:rRows[i][6],class:rRows[i][7],score:rRows[i][8],total:rRows[i][9],pct:Number(rRows[i][10]),answers:JSON.parse(rRows[i][11]||'[]'),submittedAt:rRows[i][12],status:rRows[i][13]||'complete'});
  }
  const uRows = getSheet('Users').getDataRange().getValues();
  let studentInfo = null;
  for (let i = 1; i < uRows.length; i++) {
    if (uRows[i][0]===data.studentId) { studentInfo={id:uRows[i][0],name:uRows[i][4],username:uRows[i][1],email:uRows[i][5],class:uRows[i][6]}; break; }
  }
  const completed=results.filter(r=>r.status==='complete');
  const avg=completed.length?Math.round(completed.reduce((a,r)=>a+r.pct,0)/completed.length):0;
  const bySubject={};
  completed.forEach(r=>{ if(!bySubject[r.subject])bySubject[r.subject]=[]; bySubject[r.subject].push(r.pct); });
  const subjectAvgs=Object.entries(bySubject).map(([s,ps])=>({subject:s,avg:Math.round(ps.reduce((a,b)=>a+b,0)/ps.length),count:ps.length}));
  return {success:true,student:studentInfo,results,avg,subjectAvgs};
}

function sendResultEmail(data) {
  if (!data.toEmail) return {success:false,error:'No email'};
  const p=Number(data.pct),g=p>=90?'Excellent':p>=75?'Very Good':p>=60?'Good':p>=45?'Pass':'Needs Improvement',c=p>=75?'#15803d':p>=45?'#b45309':'#991b1b';
  try { GmailApp.sendEmail(data.toEmail,`Your Result — ${data.testTitle}`,'',{htmlBody:buildResultEmail({...data,grade:g,color:c}),name:'Al Jamea Tus Saifiyah'}); return {success:true}; }
  catch(err) { return {success:false,error:err.toString()}; }
}

function sendMarksheetEmail(data) {
  if (!data.toEmail) return {success:false,error:'No email'};
  try { GmailApp.sendEmail(data.toEmail,`Marksheet — ${data.testTitle} (${data.className})`,'',{htmlBody:buildMarksheetEmail(data),name:'Al Jamea Tus Saifiyah'}); return {success:true}; }
  catch(err) { return {success:false,error:err.toString()}; }
}

function buildResultEmail(d) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;700&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#f4f0e8;font-family:'Tajawal',Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0e8;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)"><tr><td style="background:#0d1117;padding:28px 40px;text-align:center"><div style="font-family:'Amiri',Georgia,serif;font-size:26px;color:#c9a84c">الجامعة السيفية</div><div style="font-size:10px;color:#9ca3af;letter-spacing:3px;text-transform:uppercase;margin-top:2px">Al Jamea Tus Saifiyah · Arabic Academy</div></td></tr><tr><td style="padding:36px 40px;text-align:center"><div style="font-size:13px;color:#9ca3af;margin-bottom:6px">Dear ${d.toName},</div><div style="font-size:17px;font-weight:700;color:#1a1208;margin-bottom:22px">Your test result is ready</div><div style="display:inline-block;background:${d.color};border-radius:14px;padding:22px 44px;margin-bottom:14px"><div style="font-family:'Amiri',serif;font-size:60px;font-weight:700;color:#fff;line-height:1">${d.pct}%</div><div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:4px">${d.grade}</div></div><div style="font-size:13px;color:#6b7280">${d.score} out of ${d.total} marks</div></td></tr><tr><td style="padding:0 40px 28px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="49%" style="padding:11px;background:#f9f5ed;border-radius:10px 0 0 10px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Test</div><div style="font-size:13px;font-weight:700">${d.testTitle}</div></td><td width="2%" style="background:#e5d9c0"></td><td width="49%" style="padding:11px;background:#f9f5ed;border-radius:0 10px 10px 0;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Subject</div><div style="font-size:13px;font-weight:700">${d.subject}</div></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:7px"><tr><td width="49%" style="padding:11px;background:#f9f5ed;border-radius:10px 0 0 10px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Class</div><div style="font-size:13px;font-weight:700">${d.className}</div></td><td width="2%" style="background:#e5d9c0"></td><td width="49%" style="padding:11px;background:#f9f5ed;border-radius:0 10px 10px 0;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Date</div><div style="font-size:13px;font-weight:700">${d.date}</div></td></tr></table></td></tr><tr><td style="background:#0d1117;padding:18px 40px;text-align:center"><div style="font-size:11px;color:#6b7280">Sent by <span style="color:#c9a84c">${d.teacherName}</span> · AJTS Quiz Platform</div></td></tr></table></td></tr></table></body></html>`;
}

function buildMarksheetEmail(d) {
  const avg=d.marksheet.length?Math.round(d.marksheet.reduce((a,s)=>a+s.pct,0)/d.marksheet.length):0;
  const rows=d.marksheet.map((s,i)=>`<tr style="background:${i%2===0?'#fff':'#f9f5ed'}"><td style="padding:9px 12px;font-size:12px;border-bottom:1px solid #e5d9c0">${i+1}</td><td style="padding:9px 12px;font-size:12px;font-weight:600;border-bottom:1px solid #e5d9c0">${s.name}</td><td style="padding:9px 12px;font-size:12px;text-align:center;border-bottom:1px solid #e5d9c0">${s.score}/${s.total}</td><td style="padding:9px 12px;font-size:12px;text-align:center;font-weight:700;color:${s.pct>=75?'#15803d':s.pct>=45?'#b45309':'#991b1b'};border-bottom:1px solid #e5d9c0">${s.pct}%</td><td style="padding:9px 12px;font-size:12px;text-align:center;border-bottom:1px solid #e5d9c0">${s.pct>=90?'Excellent':s.pct>=75?'Very Good':s.pct>=60?'Good':s.pct>=45?'Pass':'Needs Improvement'}</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;700&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#f4f0e8;font-family:'Tajawal',Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0e8;padding:32px 0"><tr><td align="center"><table width="680" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)"><tr><td style="background:#0d1117;padding:24px 36px"><div style="font-family:'Amiri',serif;font-size:24px;color:#c9a84c">الجامعة السيفية</div><div style="font-size:10px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Al Jamea Tus Saifiyah · Arabic Academy</div></td></tr><tr><td style="padding:24px 36px 14px"><div style="font-size:18px;font-weight:800;color:#1a1208;margin-bottom:4px">Class Marksheet</div><div style="font-size:12px;color:#9ca3af">Test: <strong style="color:#1a1208">${d.testTitle}</strong> · Class: <strong>${d.className}</strong> · Subject: <strong>${d.subject}</strong> · Avg: <strong style="color:${avg>=75?'#15803d':avg>=45?'#b45309':'#991b1b'}">${avg}%</strong></div></td></tr><tr><td style="padding:0 36px 28px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5d9c0;border-radius:8px;overflow:hidden"><thead><tr style="background:#0d1117"><th style="padding:9px 12px;text-align:left;font-size:10px;color:#9ca3af;letter-spacing:1px">#</th><th style="padding:9px 12px;text-align:left;font-size:10px;color:#9ca3af;letter-spacing:1px">STUDENT</th><th style="padding:9px 12px;text-align:center;font-size:10px;color:#9ca3af">MARKS</th><th style="padding:9px 12px;text-align:center;font-size:10px;color:#9ca3af">%</th><th style="padding:9px 12px;text-align:center;font-size:10px;color:#9ca3af">GRADE</th></tr></thead><tbody>${rows}</tbody></table></td></tr><tr><td style="background:#0d1117;padding:16px 36px;text-align:center"><div style="font-size:11px;color:#6b7280">Sent by <span style="color:#c9a84c">${d.teacherName}</span> · AJTS Quiz Platform</div></td></tr></table></td></tr></table></body></html>`;
}

function setupAdmin() {
  getSheet('Users').appendRow([Utilities.getUuid(),'admin','admin123','admin','Administrator','','All','All',new Date().toISOString()]);
  Logger.log('Admin: username=admin password=admin123');
}

function debugUsers() {
  const rows = getSheet('Users').getDataRange().getValues();
  for (let i=1;i<rows.length;i++) Logger.log('Row'+i+' user=['+rows[i][1]+'] pass=['+rows[i][2]+'] type='+typeof rows[i][2]+' role=['+rows[i][3]+']');
}
