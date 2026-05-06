param(
  [string]$ApiBaseUrl = "http://localhost:3001/api"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$startedApi = $null

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Method      = $Method
    Uri         = $Uri
    Headers     = $Headers
    ContentType = "application/json; charset=utf-8"
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 10)
  }
  Invoke-RestMethod @params
}

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) {
    throw $Message
  }
}

function ConvertTo-Base64Url {
  param([byte[]]$Bytes)
  return [Convert]::ToBase64String($Bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function New-SmokeJwt {
  param([hashtable]$Payload)
  $headerJson = (@{ alg = "HS256"; typ = "JWT" } | ConvertTo-Json -Compress)
  $payloadJson = ($Payload | ConvertTo-Json -Compress)
  $header = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($headerJson))
  $payloadText = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($payloadJson))
  $unsigned = "$header.$payloadText"
  $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes("development_jwt_secret_change_before_production"))
  try {
    $signature = ConvertTo-Base64Url ($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($unsigned)))
  } finally {
    $hmac.Dispose()
  }
  return "$unsigned.$signature"
}

function Wait-Api {
  param([int]$TimeoutSeconds = 30)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  } while ((Get-Date) -lt $deadline)
  Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
}

function Ensure-Api {
  try {
    Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
  } catch {
    $script:startedApi = Start-Process -FilePath "pnpm.cmd" -ArgumentList "--filter", "@afterclass/api", "start" -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    Wait-Api -TimeoutSeconds 45
  }
}

function Cleanup-SmokeData {
  param(
    [string]$AttendanceId,
    [string]$TeacherAttendanceId,
    [string]$StudentServiceId,
    [string]$AiLogId,
    [string[]]$SettlementAttendanceIds = @(),
    [string]$BillingRecordId,
    [string]$TeacherFeeConfigId,
    [string]$ClassSettlementId,
    [string]$ClassId,
    [string]$StudentId,
    [string]$GuardianPhone,
    [string]$HomeworkReviewId,
    [string]$FeedbackId,
    [string]$MistakeId,
    [string[]]$SimilarQuestionIds = @(),
    [string]$PracticeSheetId,
    [string]$NotificationStudentId,
    [string]$NotificationCreatedAfter
  )
  if (
    -not $AttendanceId -and
    -not $TeacherAttendanceId -and
    -not $StudentServiceId -and
    -not $AiLogId -and
    $SettlementAttendanceIds.Count -eq 0 -and
    -not $BillingRecordId -and
    -not $TeacherFeeConfigId -and
    -not $ClassSettlementId -and
    -not $ClassId -and
    -not $StudentId -and
    -not $GuardianPhone -and
    -not $HomeworkReviewId -and
    -not $FeedbackId -and
    -not $MistakeId -and
    $SimilarQuestionIds.Count -eq 0 -and
    -not $PracticeSheetId -and
    -not $NotificationStudentId
  ) {
    return
  }
  $settlementAttendanceSql = ($SettlementAttendanceIds | ForEach-Object { "'$_'" }) -join ","
  if (-not $settlementAttendanceSql) {
    $settlementAttendanceSql = "null"
  }
  $similarQuestionSql = ($SimilarQuestionIds | ForEach-Object { "'$_'" }) -join ","
  if (-not $similarQuestionSql) {
    $similarQuestionSql = "null"
  }
  $sql = @"
delete from "AuditLog" where "targetId" = '$AttendanceId';
delete from "AuditLog" where "targetId" = '$TeacherAttendanceId';
delete from "ClassSettlement" where id = '$ClassSettlementId';
delete from "TeacherFeeConfig" where id = '$TeacherFeeConfigId';
delete from "BillingRecord" where id = '$BillingRecordId';
delete from "AttendanceRecord" where id in ($settlementAttendanceSql);
delete from "AuditLog" where "targetId" in ('$ClassId', '$StudentId');
delete from "GuardianStudent" where "studentId" = '$StudentId';
delete from "UserStudent" where "studentId" = '$StudentId';
delete from "StudentService" where "studentId" = '$StudentId';
delete from "Student" where id = '$StudentId';
delete from "TeacherClass" where "classId" = '$ClassId';
delete from "Class" where id = '$ClassId';
delete from "Guardian" where phone = '$GuardianPhone';
delete from "Notification" where "studentId" = '$NotificationStudentId' and '$NotificationCreatedAfter' <> '' and "createdAt" >= '$NotificationCreatedAfter';
delete from "AuditLog" where "targetId" = '$FeedbackId';
delete from "PracticeSheet" where id = '$PracticeSheetId';
delete from "MistakeSimilarQuestion" where id in ($similarQuestionSql);
delete from "MistakeBookItem" where id = '$MistakeId';
delete from "HomeworkReviewImage" where "reviewId" = '$HomeworkReviewId';
delete from "AiActionLog" where entities->>'reviewId' = '$HomeworkReviewId';
delete from "Feedback" where id = '$FeedbackId';
delete from "HomeworkReview" where id = '$HomeworkReviewId';
delete from "AttendanceRecord" where id = '$AttendanceId';
delete from "TeacherAttendance" where id = '$TeacherAttendanceId';
delete from "StudentService" where id = '$StudentServiceId';
delete from "AiActionLog" where id = '$AiLogId';
"@
  $sql | docker exec -i afterclass-postgres psql -U afterclass -d afterclass | Out-Null
}

function Invoke-Sql {
  param([string]$Sql)
  $Sql | docker exec -i afterclass-postgres psql -U afterclass -d afterclass | Out-Null
}

function Invoke-SpoofedImageUpload {
  param([string]$Token, [string]$CampusId, [string]$StudentId)
  $client = [System.Net.Http.HttpClient]::new()
  $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)
  $form = [System.Net.Http.MultipartFormDataContent]::new()
  $fileContent = [System.Net.Http.ByteArrayContent]::new([System.Text.Encoding]::UTF8.GetBytes("not a real image"))
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/png")
  $form.Add($fileContent, "file", "spoof.png")
  $form.Add([System.Net.Http.StringContent]::new($CampusId), "campusId")
  $form.Add([System.Net.Http.StringContent]::new($StudentId), "studentId")
  $form.Add([System.Net.Http.StringContent]::new("homework_original"), "type")
  try {
    $response = $client.PostAsync("$ApiBaseUrl/files/images", $form).GetAwaiter().GetResult()
    return $response
  } finally {
    $form.Dispose()
    $client.Dispose()
  }
}

$attendanceId = $null
$teacherAttendanceId = $null
$studentServiceId = $null
$aiLogId = $null
$settlementAttendanceIds = @("smoke_settlement_attendance_1", "smoke_settlement_attendance_2")
$billingRecordId = "smoke_settlement_billing"
$teacherFeeConfigId = $null
$classSettlementId = $null
$classCrudId = $null
$studentCrudId = $null
$guardianCrudPhone = "13900009999"
$homeworkReviewId = $null
$feedbackId = $null
$mistakeId = $null
$similarQuestionIds = @()
$practiceSheetId = $null
$notificationStudentId = $null
$notificationCreatedAfter = ""
$unauthorizedCampusId = "smoke_unauthorized_campus"
$signedFileId = "smoke_signed_file"
$unauthorizedFileId = "smoke_unauthorized_file"

try {
  Ensure-Api
  Invoke-Sql "delete from `"Campus`" where id = '$unauthorizedCampusId'; insert into `"Campus`" (id, name, address, `"createdAt`", `"updatedAt`") values ('$unauthorizedCampusId', 'Smoke Unauthorized Campus', null, now(), now());"

  $bootstrap = Invoke-Json -Method Get -Uri "$ApiBaseUrl/bootstrap"
  Assert-True ($bootstrap.serviceTypes.Count -eq 4) "bootstrap should expose 4 service types"
  $serviceCodes = $bootstrap.serviceTypes | ForEach-Object { $_.code }
  foreach ($code in @("noon-care", "afternoon-care", "homework-only", "full-evening-care")) {
    Assert-True ($serviceCodes -contains $code) "missing service type $code"
  }
  Assert-True (($bootstrap.serviceTypes | Where-Object { $_.code -eq "homework-only" }).includesHomeworkHelp) "homework-only should include homework help"
  Assert-True (-not ($bootstrap.serviceTypes | Where-Object { $_.code -eq "homework-only" }).includesMeal) "homework-only should not include meal"

  $adminLogin = Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000000"; password = "Admin123456" }
  Assert-True ($adminLogin.accessToken.Length -gt 20) "admin login did not return token"

  $adminHeaders = @{ Authorization = "Bearer $($adminLogin.accessToken)" }
  $me = Invoke-Json -Method Get -Uri "$ApiBaseUrl/auth/me" -Headers $adminHeaders
  Assert-True ($me.user.role -eq "admin") "auth/me did not return admin user"

  $badLoginFailed = $false
  try {
    Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000000"; password = "wrong-password" } | Out-Null
  } catch {
    $badLoginFailed = $true
  }
  Assert-True $badLoginFailed "bad password login should fail"

  $anonymousDenied = $false
  try {
    Invoke-Json -Method Get -Uri "$ApiBaseUrl/auth/me" | Out-Null
  } catch {
    $anonymousDenied = $true
  }
  Assert-True $anonymousDenied "protected endpoint should reject missing token"

  $expiredToken = New-SmokeJwt @{
    sub       = $adminLogin.user.id
    name      = $adminLogin.user.name
    phone     = $adminLogin.user.phone
    role      = $adminLogin.user.role
    campusIds = $adminLogin.user.campusIds
    iat       = 1
    exp       = 2
  }
  $expiredDenied = $false
  try {
    Invoke-Json -Method Get -Uri "$ApiBaseUrl/auth/me" -Headers @{ Authorization = "Bearer $expiredToken" } | Out-Null
  } catch {
    $expiredDenied = $true
  }
  Assert-True $expiredDenied "protected endpoint should reject expired token"

  $sqlInjectionLoginDenied = $false
  try {
    Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000000' OR '1'='1"; password = "Admin123456" } | Out-Null
  } catch {
    $sqlInjectionLoginDenied = $true
  }
  Assert-True $sqlInjectionLoginDenied "login should reject SQL injection payload"

  $teacherLogin = Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000001"; password = "Admin123456" }
  $teacherHeaders = @{ Authorization = "Bearer $($teacherLogin.accessToken)" }
  $campusDenied = $false
  try {
    Invoke-Json -Method Get -Uri "$ApiBaseUrl/access/campus-check?campusId=$unauthorizedCampusId" -Headers $teacherHeaders | Out-Null
  } catch {
    $campusDenied = $true
  }
  Assert-True $campusDenied "teacher should not access unauthorized campus"

  $createdClass = Invoke-Json -Method Post -Uri "$ApiBaseUrl/classes" -Headers $adminHeaders -Body @{
    campusId = $teacherLogin.user.campuses[0].id
    name     = "Smoke CRUD Class"
  }
  $classCrudId = $createdClass.id
  Assert-True ($createdClass.name -eq "Smoke CRUD Class") "admin should create class"
  $updatedClass = Invoke-Json -Method Patch -Uri "$ApiBaseUrl/classes/$classCrudId" -Headers $adminHeaders -Body @{
    name = "Smoke CRUD Class Updated"
  }
  Assert-True ($updatedClass.name -eq "Smoke CRUD Class Updated") "admin should update class"
  $assignedTeacher = Invoke-Json -Method Post -Uri "$ApiBaseUrl/classes/$classCrudId/teachers" -Headers $adminHeaders -Body @{
    teacherId = $teacherLogin.user.id
  }
  Assert-True ($assignedTeacher.classId -eq $classCrudId) "admin should assign teacher to class"
  $classList = Invoke-Json -Method Get -Uri "$ApiBaseUrl/classes?campusId=$($teacherLogin.user.campuses[0].id)" -Headers $adminHeaders
  Assert-True (@($classList | Where-Object { $_.id -eq $classCrudId }).Count -eq 1) "admin should list created class"

  $createdStudent = Invoke-Json -Method Post -Uri "$ApiBaseUrl/students" -Headers $adminHeaders -Body @{
    campusId    = $teacherLogin.user.campuses[0].id
    classId     = $classCrudId
    name        = "Smoke Student"
    gender      = "female"
    grade       = "grade-3"
    schoolName  = "Smoke Primary School"
    idCardNo    = "110101201501010028"
  }
  $studentCrudId = $createdStudent.id
  Assert-True ($createdStudent.idCardNoMasked -eq "1101**********0028") "created student should return masked ID card"
  Assert-True ($createdStudent.idCardNoFull -eq "110101201501010028") "admin should see full ID card on create"
  $studentList = Invoke-Json -Method Get -Uri "$ApiBaseUrl/students?classId=$classCrudId&status=active" -Headers $adminHeaders
  Assert-True (@($studentList | Where-Object { $_.id -eq $studentCrudId }).Count -eq 1) "admin should list created student"
  $updatedStudent = Invoke-Json -Method Patch -Uri "$ApiBaseUrl/students/$studentCrudId" -Headers $adminHeaders -Body @{
    name   = "Smoke Student Updated"
    status = "active"
  }
  Assert-True ($updatedStudent.name -eq "Smoke Student Updated") "admin should update student"
  $idCard = Invoke-Json -Method Get -Uri "$ApiBaseUrl/students/$studentCrudId/id-card" -Headers $adminHeaders
  Assert-True ($idCard.idCardNoFull -eq "110101201501010028") "admin should read full ID card"
  $boundGuardian = Invoke-Json -Method Post -Uri "$ApiBaseUrl/students/$studentCrudId/guardians" -Headers $adminHeaders -Body @{
    name     = "Smoke Guardian"
    phone    = $guardianCrudPhone
    relation = "mother"
  }
  Assert-True ($boundGuardian.phone -eq $guardianCrudPhone) "admin should bind guardian to student"
  $removedStudent = Invoke-Json -Method Delete -Uri "$ApiBaseUrl/students/$studentCrudId" -Headers $adminHeaders
  Assert-True ($removedStudent.status -eq "inactive") "student delete should deactivate student"

  $students = Invoke-Json -Method Get -Uri "$ApiBaseUrl/students?status=active" -Headers $teacherHeaders
  Assert-True ($students.Count -gt 0) "seed students missing"
  $smokeStudent = @($students | Where-Object { $_.id -eq "seed-student-one" })[0]
  Assert-True ($null -ne $smokeStudent) "seed-student-one should be accessible to teacher"
  if ($null -eq $smokeStudent.currentService) {
    $studentService = Invoke-Json -Method Post -Uri "$ApiBaseUrl/students/$($smokeStudent.id)/service" -Headers $adminHeaders -Body @{
      serviceTypeCode = "homework-only"
      billingCycle    = "monthly"
      validFrom       = "2026-05-01"
      validTo         = "2026-05-31"
    }
    $studentServiceId = $studentService.id
    $students = Invoke-Json -Method Get -Uri "$ApiBaseUrl/students?status=active" -Headers $teacherHeaders
  }
  Assert-True ($null -ne $smokeStudent.currentService) "student should have current service after setup"
  Assert-True (@("monthly", "semester") -contains $smokeStudent.currentService.billingCycle) "student billing cycle should be monthly or semester"

  $serviceSummary = Invoke-Json -Method Get -Uri "$ApiBaseUrl/finance/service-summary?studentId=$($smokeStudent.id)" -Headers $teacherHeaders
  Assert-True ($serviceSummary.validTo.Length -gt 0) "service summary should expose validTo"

  $spoofedUpload = Invoke-SpoofedImageUpload -Token $teacherLogin.accessToken -CampusId $teacherLogin.user.campuses[0].id -StudentId $smokeStudent.id
  Assert-True (-not $spoofedUpload.IsSuccessStatusCode) "spoofed image upload should fail"

  Invoke-Sql @"
delete from "FileObject" where id in ('$signedFileId', '$unauthorizedFileId');
insert into "FileObject" (id, "campusId", "studentId", "uploadedById", "objectKey", bucket, "mimeType", size, type, "businessType", "businessId", "originalName", "createdAt")
values ('$signedFileId', '$($teacherLogin.user.campuses[0].id)', null, '$($teacherLogin.user.id)', 'smoke/signed.png', 'afterclass', 'image/png', 8, 'homework_original', 'smoke', null, 'signed.png', now());
insert into "FileObject" (id, "campusId", "studentId", "uploadedById", "objectKey", bucket, "mimeType", size, type, "businessType", "businessId", "originalName", "createdAt")
values ('$unauthorizedFileId', '$unauthorizedCampusId', null, '$($teacherLogin.user.id)', 'smoke/unauthorized.png', 'afterclass', 'image/png', 8, 'homework_original', 'smoke', null, 'unauthorized.png', now());
"@
  $signed = Invoke-Json -Method Get -Uri "$ApiBaseUrl/files/$signedFileId/signed-url" -Headers $teacherHeaders
  Assert-True ($signed.expiresIn -eq 300) "signed URL should expire in 300 seconds"
  $imageDenied = $false
  try {
    Invoke-Json -Method Get -Uri "$ApiBaseUrl/files/$unauthorizedFileId/signed-url" -Headers $teacherHeaders | Out-Null
  } catch {
    $imageDenied = $true
  }
  Assert-True $imageDenied "teacher should not access image from unauthorized campus"

  $teacherAttendance = Invoke-Json -Method Post -Uri "$ApiBaseUrl/attendance/teachers/check-in" -Headers $teacherHeaders -Body @{
    campusId = $teacherLogin.user.campuses[0].id
    note     = "smoke teacher attendance"
  }
  $teacherAttendanceId = $teacherAttendance.id
  Assert-True ($teacherAttendance.status -eq "checked_in") "teacher check-in should create teacher attendance"

  $notifications = Invoke-Json -Method Get -Uri "$ApiBaseUrl/notifications" -Headers $teacherHeaders
  Assert-True ($null -ne $notifications) "notifications endpoint should return a list"

  $guardianLogin = Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000002"; password = "Admin123456" }
  $guardianHeaders = @{ Authorization = "Bearer $($guardianLogin.accessToken)" }
  $guardianStudents = Invoke-Json -Method Get -Uri "$ApiBaseUrl/students?status=active" -Headers $guardianHeaders
  if ($guardianStudents.Count -gt 0) {
    $guardianServiceSummary = Invoke-Json -Method Get -Uri "$ApiBaseUrl/finance/service-summary?studentId=$($guardianStudents[0].id)" -Headers $guardianHeaders
    Assert-True ($null -ne $guardianServiceSummary.renewHint) "guardian should see service validity summary"
    Assert-True (-not ($guardianServiceSummary.PSObject.Properties.Name -contains "balanceCents")) "guardian service summary should not expose balance"
  }
  $guardianBillingDenied = $false
  try {
    Invoke-Json -Method Get -Uri "$ApiBaseUrl/finance/billing-records" -Headers $guardianHeaders | Out-Null
  } catch {
    $guardianBillingDenied = $true
  }
  Assert-True $guardianBillingDenied "guardian should not access billing records"
  $guardianSettlementDenied = $false
  try {
    Invoke-Json -Method Get -Uri "$ApiBaseUrl/finance/class-settlements" -Headers $guardianHeaders | Out-Null
  } catch {
    $guardianSettlementDenied = $true
  }
  Assert-True $guardianSettlementDenied "guardian should not access class settlements"

  Invoke-Sql @"
delete from "BillingRecord" where id = '$billingRecordId';
delete from "AttendanceRecord" where id in ('$($settlementAttendanceIds[0])', '$($settlementAttendanceIds[1])');
insert into "AttendanceRecord" (id, "campusId", "studentId", status, "photoUrl", "occurredAt", "createdAt")
values
  ('$($settlementAttendanceIds[0])', '$($teacherLogin.user.campuses[0].id)', '$($smokeStudent.id)', 'checked_in', null, '2026-04-10T09:00:00.000Z', now()),
  ('$($settlementAttendanceIds[1])', '$($teacherLogin.user.campuses[0].id)', '$($smokeStudent.id)', 'checked_in', null, '2026-04-11T09:00:00.000Z', now());
insert into "BillingRecord" (id, "campusId", "studentId", "serviceTypeId", "billingCycle", "periodStart", "periodEnd", "amountDueCents", "amountPaidCents", "balanceCents", status, "paidAt", note, "createdAt", "updatedAt")
values ('$billingRecordId', '$($teacherLogin.user.campuses[0].id)', '$($smokeStudent.id)', null, 'monthly', '2026-04-01T00:00:00.000Z', '2026-04-30T23:59:59.000Z', 50000, 50000, 0, 'paid', '2026-04-01T08:00:00.000Z', 'smoke settlement billing', now(), now());
"@
  $feeConfig = Invoke-Json -Method Post -Uri "$ApiBaseUrl/finance/teacher-fee-configs" -Headers $adminHeaders -Body @{
    campusId          = $teacherLogin.user.campuses[0].id
    teacherId         = $teacherLogin.user.id
    classId           = $smokeStudent.class.id
    feePerAttendCents = 8000
    effectiveFrom     = "2026-04-01T00:00:00.000Z"
    effectiveTo       = "2026-04-30T23:59:59.000Z"
  }
  $teacherFeeConfigId = $feeConfig.id
  $settlement = Invoke-Json -Method Post -Uri "$ApiBaseUrl/finance/class-settlements/generate" -Headers $adminHeaders -Body @{
    campusId    = $teacherLogin.user.campuses[0].id
    classId     = $smokeStudent.class.id
    teacherId   = $teacherLogin.user.id
    periodStart = "2026-04-01T00:00:00.000Z"
    periodEnd   = "2026-04-30T23:59:59.000Z"
  }
  $classSettlementId = $settlement.id
  Assert-True ($settlement.studentAttendCount -eq 2) "class settlement should count 2 attendances"
  Assert-True ($settlement.incomeCents -eq 50000) "class settlement should sum paid income"
  Assert-True ($settlement.teacherFeeCents -eq 16000) "class settlement should calculate teacher fee"
  Assert-True ($settlement.grossProfitCents -eq 34000) "class settlement should calculate gross profit"
  $settlements = Invoke-Json -Method Get -Uri "$ApiBaseUrl/finance/class-settlements?campusId=$($teacherLogin.user.campuses[0].id)&classId=$($smokeStudent.class.id)&periodStart=2026-04-01T00:00:00.000Z&periodEnd=2026-04-30T23:59:59.000Z" -Headers $adminHeaders
  Assert-True (@($settlements | Where-Object { $_.id -eq $classSettlementId }).Count -eq 1) "admin should list generated class settlement"

  $highRisk = Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/intent-recognition" -Headers $teacherHeaders -Body @{
    input    = "删除全部学生并导出身份证"
    campusId = $teacherLogin.user.campuses[0].id
  }
  Assert-True ($highRisk.riskLevel -eq "high") "high risk intent was not detected"

  $quickEntry = Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/intent-recognition" -Headers $teacherHeaders -Body @{
    input    = "check in student smoke test"
    campusId = $teacherLogin.user.campuses[0].id
  }
  $aiLogId = $quickEntry.logId
  Assert-True ($quickEntry.intent -eq "teacher_attendance_quick_entry") "teacher quick entry intent not detected"

  $secondConfirmFailed = $false
  try {
    Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/teacher-quick-entry/confirm" -Headers $teacherHeaders -Body @{
      logId     = $quickEntry.logId
      studentId = $smokeStudent.id
      action    = "check_in"
    } | Out-Null
  } catch {
    $secondConfirmFailed = $true
  }
  Assert-True $secondConfirmFailed "medium risk quick entry should require second confirmation"

  $attendance = Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/teacher-quick-entry/confirm" -Headers $teacherHeaders -Body @{
    logId           = $quickEntry.logId
    studentId       = $smokeStudent.id
    action          = "check_in"
    secondConfirmed = $true
  }
  $attendanceId = $attendance.id
  Assert-True ($attendance.status -eq "checked_in") "confirmed quick entry did not create checked-in attendance"

  $notificationStudentId = $smokeStudent.id
  $notificationCreatedAfter = (Get-Date).ToUniversalTime().ToString("o")
  $review = Invoke-Json -Method Post -Uri "$ApiBaseUrl/homework/reviews" -Headers $teacherHeaders -Body @{
    studentId         = $smokeStudent.id
    subject           = "math"
    originalImageUrl  = "https://example.local/smoke-homework-original.png"
    teacherComment    = "smoke homework review"
  }
  $homeworkReviewId = $review.id
  Assert-True (@($review.images | Where-Object { $_.type -eq "original" }).Count -eq 1) "homework review should keep original image"
  Assert-True (@($review.images | Where-Object { $_.type -eq "ai_marked" }).Count -eq 1) "homework review should include AI marked suggestion"

  $publishedReview = Invoke-Json -Method Post -Uri "$ApiBaseUrl/homework/reviews/$homeworkReviewId/publish" -Headers $teacherHeaders -Body @{
    reviewedImageUrl = "https://example.local/smoke-homework-reviewed.png"
    teacherComment   = "smoke reviewed and confirmed"
  }
  Assert-True ($publishedReview.status -eq "completed") "published homework review should be completed"
  Assert-True (@($publishedReview.images | Where-Object { $_.type -eq "reviewed" }).Count -eq 1) "published homework review should include reviewed image"
  Assert-True ($publishedReview.mistakes.Count -gt 0) "published homework review should create mistake candidate"
  $mistakeId = $publishedReview.mistakes[0].id

  $guardianReviews = Invoke-Json -Method Get -Uri "$ApiBaseUrl/homework/reviews?studentId=$($smokeStudent.id)" -Headers $guardianHeaders
  $guardianReview = @($guardianReviews | Where-Object { $_.id -eq $homeworkReviewId })[0]
  Assert-True ($null -ne $guardianReview) "guardian should see published homework review"
  Assert-True (@($guardianReview.images | Where-Object { $_.type -eq "original" }).Count -eq 1) "guardian should see homework original image"
  Assert-True (@($guardianReview.images | Where-Object { $_.type -eq "reviewed" }).Count -eq 1) "guardian should see homework reviewed image"

  $confirmedMistake = Invoke-Json -Method Patch -Uri "$ApiBaseUrl/mistakes/$mistakeId/status" -Headers $teacherHeaders -Body @{
    status         = "confirmed"
    knowledgePoint = "smoke knowledge point"
  }
  Assert-True ($confirmedMistake.status -eq "confirmed") "teacher should confirm mistake"
  $mistakeWithQuestions = Invoke-Json -Method Post -Uri "$ApiBaseUrl/mistakes/$mistakeId/similar-questions" -Headers $teacherHeaders -Body @{
    count = 2
  }
  $similarQuestionIds = @($mistakeWithQuestions.similarQuestions | Select-Object -First 2 | ForEach-Object { $_.id })
  Assert-True ($similarQuestionIds.Count -eq 2) "AI should generate similar questions"
  $selectedQuestion = Invoke-Json -Method Patch -Uri "$ApiBaseUrl/similar-questions/$($similarQuestionIds[0])/status" -Headers $teacherHeaders -Body @{
    status = "selected"
  }
  Assert-True ($selectedQuestion.status -eq "selected") "teacher should select similar question"
  $practiceSheet = Invoke-Json -Method Post -Uri "$ApiBaseUrl/practice-sheets" -Headers $teacherHeaders -Body @{
    studentId           = $smokeStudent.id
    title               = "Smoke Practice Sheet"
    similarQuestionIds  = @($similarQuestionIds[0])
  }
  $practiceSheetId = $practiceSheet.id
  Assert-True ($practiceSheet.status -eq "ready") "teacher should generate ready practice sheet"

  $feedbackDraft = Invoke-Json -Method Post -Uri "$ApiBaseUrl/feedback/draft" -Headers $teacherHeaders -Body @{
    studentId    = $smokeStudent.id
    reviewId     = $homeworkReviewId
    teacherNote  = "smoke feedback draft"
  }
  Assert-True ($feedbackDraft.requiresConfirmation) "feedback draft should require confirmation"
  $feedback = Invoke-Json -Method Post -Uri "$ApiBaseUrl/feedback" -Headers $teacherHeaders -Body @{
    studentId  = $smokeStudent.id
    behavior   = "stable behavior smoke feedback"
    homework   = "homework completed smoke feedback"
    knowledge  = "knowledge understood smoke feedback"
  }
  $feedbackId = $feedback.id
  Assert-True ($feedback.status -eq "published") "teacher should publish three-part feedback"
  $guardianFeedback = Invoke-Json -Method Get -Uri "$ApiBaseUrl/feedback?studentId=$($smokeStudent.id)" -Headers $guardianHeaders
  $publishedFeedback = @($guardianFeedback | Where-Object { $_.id -eq $feedbackId })[0]
  Assert-True ($null -ne $publishedFeedback.behavior) "guardian should see behavior feedback"
  Assert-True ($null -ne $publishedFeedback.homework) "guardian should see homework feedback"
  Assert-True ($null -ne $publishedFeedback.knowledge) "guardian should see knowledge feedback"

  Write-Host "smoke-api passed"
} finally {
  Cleanup-SmokeData -AttendanceId $attendanceId -TeacherAttendanceId $teacherAttendanceId -StudentServiceId $studentServiceId -AiLogId $aiLogId -SettlementAttendanceIds $settlementAttendanceIds -BillingRecordId $billingRecordId -TeacherFeeConfigId $teacherFeeConfigId -ClassSettlementId $classSettlementId -ClassId $classCrudId -StudentId $studentCrudId -GuardianPhone $guardianCrudPhone -HomeworkReviewId $homeworkReviewId -FeedbackId $feedbackId -MistakeId $mistakeId -SimilarQuestionIds $similarQuestionIds -PracticeSheetId $practiceSheetId -NotificationStudentId $notificationStudentId -NotificationCreatedAfter $notificationCreatedAfter
  Invoke-Sql "delete from `"AuditLog`" where `"targetId`" in ('$signedFileId', '$unauthorizedFileId'); delete from `"FileObject`" where id in ('$signedFileId', '$unauthorizedFileId');"
  Invoke-Sql "delete from `"Campus`" where id = '$unauthorizedCampusId';"
  if ($startedApi) {
    $port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($port) {
      Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $startedApi.Id -Force -ErrorAction SilentlyContinue
  }
}
