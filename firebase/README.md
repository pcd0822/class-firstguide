# Firebase 규칙 (Rules)

이 폴더의 규칙을 Firebase에 한 번에 적용하는 방법입니다.

## 방법 1: Firebase 콘솔에서 복사·붙여넣기

### Firestore

1. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 선택
2. **Firestore Database** → **규칙** 탭
3. `firestore.rules` 파일 내용 전체 복사 후 붙여넣기
4. **게시** 클릭

### Storage

1. **Storage** → **규칙** 탭
2. `storage.rules` 파일 내용 전체 복사 후 붙여넣기
3. **게시** 클릭

---

## 방법 2: Firebase CLI로 배포

프로젝트 루트에서:

```bash
# CLI 설치 후 로그인 (최초 1회)
npm install -g firebase-tools
firebase login

# Firebase 프로젝트 연결 (최초 1회)
firebase use --add
# 사용할 프로젝트 선택

# 규칙만 배포 (프로젝트 루트에서 실행)
firebase deploy --only firestore:rules
firebase deploy --only storage
```

프로젝트 루트의 `firebase.json`에 이미 규칙 경로가 설정되어 있습니다.

---

## 보안 참고

현재 규칙은 **개발/데모용**으로 모든 읽기·쓰기를 허용합니다.  
실서비스에서는 Firebase Authentication을 연동한 뒤, 예를 들어 `request.auth != null` 조건으로 제한하는 것을 권장합니다.
