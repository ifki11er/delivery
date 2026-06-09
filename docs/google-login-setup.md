# Google 로그인 설정 가이드

이 서비스는 Google 로그인을 두 가지 방식으로 처리한다.

- 웹 브라우저 로그인: NextAuth가 Google Web OAuth Client를 사용한다.
- Android 앱 로그인: Android 네이티브 Google Sign-In으로 Google 계정을 선택한 뒤, ID Token을 웹 서버로 전달한다.

가장 중요한 규칙은 아래와 같다.

```text
Android 앱에서도 ID Token은 Web Client ID 기준으로 요청한다.
Android OAuth Client ID는 Google Cloud에 등록만 하고, 현재 코드 설정값으로는 직접 넣지 않는다.
```

## Google Cloud OAuth Client 구성

Google Cloud Console의 같은 프로젝트 안에 OAuth Client를 2개 만든다.

### 1. Web Application Client

OAuth Client 유형을 `Web application`으로 만든다.

이 Client는 웹 로그인과 Android 네이티브 로그인에서 모두 중요하다.

웹 서버 설정:

```env
# web_ui/.env.local
AUTH_GOOGLE_ID="YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="YOUR_WEB_CLIENT_SECRET"
```

Android 앱 로컬 설정:

```properties
# android_app/local.properties
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

주의:

```text
AUTH_GOOGLE_ID와 GOOGLE_WEB_CLIENT_ID는 같은 Web Client ID여야 한다.
```

`android_app/local.properties`는 개발 PC의 로컬 설정 파일이며 git에 커밋하면 안 된다.

### 2. Android Client

OAuth Client 유형을 `Android`로 만든다.

설정값:

```text
Package name: com.chingu.worklink
SHA-1 certificate fingerprint: debug 또는 release SHA-1
```

Google Cloud에서 Android Client를 만들면 Android Client ID가 나온다.
현재 코드 구조에서는 이 Android Client ID를 직접 사용하지 않는다.

Android Client는 Google Play Services가 설치된 앱을 검증할 때 사용한다.

```text
설치된 앱의 package name + SHA-1
-> Google Cloud에 등록된 Android OAuth Client와 일치하는지 확인
-> 일치하면 Google 계정 선택 및 ID Token 발급 가능
```

## 개발용 Debug 설정

Android Studio에서 개발 중인 debug 빌드는 debug keystore로 서명된다.

현재 개발 PC의 debug SHA-1:

```text
E3:6A:CF:7D:1D:E9:2E:5A:8C:AF:77:36:22:F3:E9:01:10:27:C9:6A
```

Windows에서 debug SHA-1을 다시 확인하는 명령어:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Google Cloud Console에는 아래처럼 등록한다.

```text
OAuth Client type: Android
Package name: com.chingu.worklink
SHA-1: E3:6A:CF:7D:1D:E9:2E:5A:8C:AF:77:36:22:F3:E9:01:10:27:C9:6A
```

Google Cloud OAuth 설정을 수정한 뒤에는:

1. OAuth Client 설정을 저장한다.
2. Google 설정이 반영될 때까지 몇 분 기다린다.
3. Android 앱을 다시 빌드하고 스마트폰에 재설치한다.
4. Google 로그인을 다시 테스트한다.

## Release 설정

debug SHA-1은 debug 빌드에서만 동작한다.
release APK 또는 AAB는 release keystore로 서명되기 때문에 release용 SHA-1을 Google Cloud에 추가로 등록해야 한다.

### 직접 만든 Release Keystore를 사용하는 경우

release keystore 경로와 alias를 확인한 뒤 아래 명령으로 SHA-1을 확인한다.

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "C:\path\to\release.keystore" -alias "YOUR_RELEASE_ALIAS"
```

명령 실행 중 release keystore 비밀번호를 입력해야 한다.

확인한 release SHA-1을 Google Cloud Console에 등록한다.

```text
OAuth Client type: Android
Package name: com.chingu.worklink
SHA-1: YOUR_RELEASE_SHA1
```

운영에서는 보통 debug용 Android Client와 release용 Android Client를 분리해두는 편이 관리하기 쉽다.

### Google Play App Signing을 사용하는 경우

Google Play에 배포하고 Play App Signing을 사용하면, 최종 사용자에게 설치되는 앱은 Google Play의 App signing key로 다시 서명될 수 있다.

이 경우에는 내 PC의 release keystore SHA-1만 등록해서는 부족할 수 있다.
Google Play Console에 표시되는 App signing key certificate SHA-1을 Google Cloud에 등록해야 한다.

절차:

1. Google Play Console을 연다.
2. 앱을 선택한다.
3. App signing 또는 앱 무결성/서명 설정 화면으로 이동한다.
4. `App signing key certificate`의 SHA-1을 복사한다.
5. Google Cloud Console에서 Android OAuth Client로 등록한다.

등록값:

```text
Package name: com.chingu.worklink
SHA-1: Google Play Console의 App signing key certificate SHA-1
```

내부 테스트, 비공개 테스트, 업로드 키를 따로 쓰는 경우에는 upload key SHA-1도 필요할 수 있다.

## 실행 흐름

### 웹 브라우저 로그인

```text
사용자가 Google 버튼 클릭
-> NextAuth가 Google OAuth 시작
-> Google 로그인 후 웹 서버로 redirect
-> 서버가 사용자를 조회하거나 자동 회원가입 처리
```

사용 설정:

```text
web_ui/.env.local
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
```

### Android 앱 로그인

```text
사용자가 앱 안에서 Google 버튼 클릭
-> Android 네이티브 Google 계정 선택창 표시
-> Google Play Services가 package name + SHA-1을 Google Cloud의 Android OAuth Client와 비교
-> 앱이 GOOGLE_WEB_CLIENT_ID 기준으로 ID Token 요청
-> WebView가 ID Token을 웹 서버의 google-native provider로 전달
-> 서버가 ID Token의 audience를 AUTH_GOOGLE_ID와 비교
-> 서버가 사용자를 조회하거나 자동 회원가입 처리
```

사용 설정:

```text
android_app/local.properties
GOOGLE_WEB_CLIENT_ID

web_ui/.env.local
AUTH_GOOGLE_ID
```

반드시 아래가 같아야 한다.

```text
GOOGLE_WEB_CLIENT_ID == AUTH_GOOGLE_ID
```

## 자주 나는 오류

### Google Sign-In Error Code 10

대부분 Google Sign-In 설정이 설치된 앱과 맞지 않을 때 발생한다.

확인할 것:

- Google Cloud에 Android OAuth Client가 있는가?
- Android OAuth Client가 Web Client와 같은 Google Cloud 프로젝트에 있는가?
- Package name이 정확히 `com.chingu.worklink`인가?
- SHA-1이 현재 스마트폰에 설치된 앱의 서명키와 같은가?
- debug 앱이면 debug SHA-1을 등록했는가?
- release 앱이면 release SHA-1 또는 Google Play App signing SHA-1을 등록했는가?
- `GOOGLE_WEB_CLIENT_ID`에 Android Client ID를 넣지 않았는가?
- `AUTH_GOOGLE_ID`와 `GOOGLE_WEB_CLIENT_ID`가 같은 Web Client ID인가?

### WebView Google 정책 차단

Google은 Android WebView 안에서 일반 웹 OAuth 로그인을 막는다.
그래서 앱 안에서는 브라우저 방식의 Google OAuth가 아니라 Android 네이티브 Google Sign-In을 사용해야 한다.

현재 앱은 WebView에서 아래 Android bridge를 호출한다.

```text
window.AndroidBridge.signInWithGoogle()
```

웹 브라우저에서는 기존 NextAuth Google OAuth를 그대로 사용한다.

## 정리

개발 중에는:

```text
Google Cloud Android OAuth Client
Package name: com.chingu.worklink
SHA-1: debug SHA-1
```

배포할 때는:

```text
Google Cloud Android OAuth Client
Package name: com.chingu.worklink
SHA-1: release SHA-1 또는 Google Play App signing SHA-1
```

코드와 환경변수에는:

```text
Web Client ID 사용
Android Client ID는 직접 넣지 않음
```
