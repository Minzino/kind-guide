# 8단계 (심화): 설정 관리 (환경 변수, ConfigMap, Secret)

애플리케이션은 종종 데이터베이스 연결 정보, API 키, 로깅 레벨 등 다양한 설정 값들을 필요로 합니다. 쿠버네티스는 이러한 설정 값들을 안전하고 유연하게 관리할 수 있는 여러 방법을 제공합니다.

### 1. 환경 변수 (Environment Variables)

가장 간단한 방법입니다. 파드 내 컨테이너에 직접 환경 변수를 주입할 수 있습니다. 민감하지 않은 설정 값에 적합합니다.

### 2. ConfigMap

*   **무엇인가?** 민감하지 않은 설정 데이터를 키-값 쌍 형태로 저장하는 쿠버네티스 오브젝트입니다.
*   **왜 사용하는가?** 애플리케이션 코드와 설정을 분리하여, 코드 변경 없이 설정만 변경하여 앱을 재배포할 수 있게 합니다. 여러 파드나 디플로이먼트에서 동일한 설정을 공유할 수 있습니다.
*   **사용 방법:**
    *   환경 변수로 주입
    *   볼륨으로 마운트하여 파일 형태로 사용 (우리 NestJS 앱에서 이 방식을 사용합니다)

### 3. Secret

*   **무엇인가?** 민감한 설정 데이터(비밀번호, API 토큰, 인증서 등)를 저장하는 쿠버네티스 오브젝트입니다. ConfigMap과 유사하지만, 데이터가 Base64로 인코딩되어 저장됩니다 (암호화는 아님).
*   **왜 사용하는가?** 민감한 정보를 코드나 ConfigMap에 노출시키지 않고 안전하게 관리하기 위함입니다. Secret은 기본적으로 Base64 인코딩되어 있지만, 실제 암호화를 위해서는 추가적인 보안 조치(예: KMS, Vault)가 필요합니다.
*   **사용 방법:**
    *   환경 변수로 주입
    *   볼륨으로 마운트하여 파일 형태로 사용 (우리 NestJS 앱에서 이 방식을 사용합니다)

### NestJS 앱 수정 및 Helm 차트 업데이트

우리의 NestJS 앱은 이제 다음 엔드포인트를 통해 설정 값을 읽어올 수 있습니다.

*   `GET /config/env`: 환경 변수 `MY_ENV_VAR`의 값을 반환합니다.
*   `GET /config/configmap`: ConfigMap에서 마운트된 `/etc/config/app_config.txt` 파일의 내용을 반환합니다.
*   `GET /config/secret`: Secret에서 마운트된 `/etc/secrets/api_key.txt` 파일의 내용을 반환합니다.

이러한 엔드포인트를 위해 `nest-app/src/app.controller.ts`를 수정하고, `helm/my-nest-app` 차트에 `configmap.yaml`과 `secret.yaml` 템플릿을 추가했습니다. 또한 `deployment.yaml`에 환경 변수 주입 및 볼륨 마운트 설정을 추가했습니다.

### 실습: 설정 값 테스트

1.  **Helm 업그레이드:**

    새로운 ConfigMap과 Secret 리소스를 배포하고, Deployment에 변경사항을 적용하기 위해 Helm 릴리스를 업그레이드합니다.

    ```bash
    helm upgrade my-nest-app ./helm/my-nest-app
    ```

2.  **`k9s`로 리소스 확인:**

    `k9s`를 실행하고 다음 리소스들이 생성되었는지 확인합니다.
    *   `:cm` (ConfigMap): `my-nest-app-config`가 생성되었는지 확인합니다.
    *   `:secret` (Secret): `my-nest-app-secret`이 생성되었는지 확인합니다.

3.  **환경 변수 테스트:**

    ```bash
    curl -H "Host: my-nest-app.local" http://127.0.0.1:8080/config/env
    # 예상 출력: My environment variable value
    ```

4.  **ConfigMap 테스트:**

    ```bash
    curl -H "Host: my-nest-app.local" http://127.0.0.1:8080/config/configmap
    # 예상 출력: This is a configuration from ConfigMap.
    ```

5.  **Secret 테스트:**

    ```bash
    curl -H "Host: my-nest-app.local" http://127.0.0.1:8080/config/secret
    # 예상 출력: supersecretapikey123
    ```

---

이것으로 쿠버네티스에서 애플리케이션 설정을 관리하는 다양한 방법을 경험했습니다. 다음 단계에서는 쿠버네티스 리소스에 대한 접근 권한을 제어하는 RBAC에 대해 알아봅니다.

**➡️ [다음: 9단계 - RBAC 심화 학습](./09-rbac-deep-dive.md)**
