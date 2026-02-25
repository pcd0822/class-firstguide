# 첫날 가이드 (Class First Guide)

새 학년 첫날, 학생들이 QR 코드로 접속해 자리를 찾고 담임 선생님 퀴즈를 푸는 **아이스브레이킹·자리 찾기 실시간 웹**입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend & DB**: Firebase Firestore (실시간 동기화)
- **Storage**: Firebase Storage (상황별 이미지)
- **QR**: qrcode.react

## 환경 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Firestore Database 활성화 (테스트 모드로 시작 가능)
3. Storage 활성화
4. 프로젝트 설정 → 일반 → 앱 추가 → 웹 앱에서 환경 변수 복사

**로컬 개발** 시 프로젝트 루트에 `.env.local` 생성 후 아래 변수 설정:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Netlify 배포** 시에는 `.env` 파일을 업로드하지 마세요. Netlify 대시보드에서 환경 변수를 등록해야 합니다. (아래 [배포 (GitHub + Netlify)](#배포-github--netlify) 참고)

6. Firestore 규칙 예시 (개발용):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /classes/{classId} {
      allow read, write: if true;
      match /students/{studentId} { allow read, write: if true; }
      match /quizzes/{quizId} { allow read, write: if true; }
    }
  }
}
```

7. Storage 규칙 예시 (개발용):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /class-images/{allPaths=**} { allow read, write: if true; }
  }
}
```

## 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

---

## 배포 (GitHub + Netlify)

### 1. GitHub에 저장

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/class-firstguide.git
git branch -M main
git push -u origin main
```

### 2. Netlify에서 사이트 연결

1. [Netlify](https://www.netlify.com/) 로그인 후 **Add new site** → **Import an existing project**
2. **GitHub** 선택 후 저장소(`class-firstguide`) 연결
3. 빌드 설정은 자동 감지됩니다 (Next.js). 필요 시 아래처럼 확인:
   - **Build command**: `npm run build`
   - **Publish directory**: (비워두거나 Netlify 기본값 유지)
   - **Base directory**: (비워두기)

### 3. Firebase 환경 변수 (Netlify에 등록)

**`.env` 파일을 업로드하지 마세요.** 보안상 Netlify 대시보드에서만 설정합니다.

1. Netlify 대시보드 → 해당 사이트 선택 → **Site configuration** → **Environment variables**
2. **Add a variable** 또는 **Import from .env** (로컬에서 복사용으로만 쓰고, 실제 값은 직접 입력 권장)
3. 아래 6개 변수를 **각각 추가** (Key / Value 입력):

| Variable name | 값 (Firebase 콘솔에서 복사) |
|---------------|-----------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | 웹 앱 설정의 apiKey |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | authDomain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | projectId |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | appId |

4. **Save** 후 **Trigger deploy** → **Deploy site** 로 다시 배포하면 환경 변수가 적용됩니다.

이후 코드를 푸시할 때마다 Netlify가 자동으로 빌드·배포합니다.

> **참고**: Firestore/Storage는 클라이언트에서 바로 접속하므로, 별도 도메인 등록 없이 동작합니다. 나중에 Firebase Auth를 쓸 경우, Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 `xxx.netlify.app` 을 추가하면 됩니다.

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 홈 (교사/학생 선택) |
| `/admin/default` | 교사 관리자 대시보드 (자리·퀴즈·이미지·QR 등) |
| `/admin/default/settings` | 자리 행/열 설정 |
| `/admin/default/students` | 학생·자리 매핑 (개별/CSV) |
| `/admin/default/quiz` | 퀴즈 문항 등록 |
| `/admin/default/images` | 상황별 이미지 업로드 |
| `/admin/default/qr` | 학생 접속 링크·QR 코드 |
| `/join` | 학생이 학급 코드 입력 후 접속 |
| `/s/[classId]` | 학생 플로우 (이름 → 자리 → 착석 → 퀴즈 → 결과) |

## 학생 플로우

1. **접속**: QR 스캔 또는 `/s/default` 접속 → 초기 화면 이미지 + 이름 입력
2. **자리 확인**: 학번·자리 위치 표시
3. **착석**: [자리에 앉았어요] 클릭 → 교사 대시보드에 연두색으로 실시간 반영
4. **퀴즈 대기**: [스타트] 클릭 시 타이머 시작
5. **퀴즈**: 정답 시 정답 이미지 → 다음 문제. 오답 시 1차/2차 오답 이미지 + 힌트
6. **결과**: 최종 성공 이미지 + 총 소요 시간 (랭킹에 실시간 반영)

## 관리자 이미지 종류

- **초기 화면 이미지**: QR 접속 후 첫 화면
- **정답 이미지**: 퀴즈 정답 시
- **1차 오답 이미지**: 첫 오답 시 (힌트와 함께)
- **2차 오답 이미지**: 같은 문제 두 번째 오답 시 (힌트와 함께)
- **최종 성공 이미지**: 모든 퀴즈 완료 시
