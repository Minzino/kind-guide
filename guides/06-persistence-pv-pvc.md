# 6단계 (심화): 데이터 영속성 (PV & PVC)

지금까지 우리가 배포한 NestJS 앱은 **상태가 없는(Stateless)** 애플리케이션입니다. 즉, 파드가 재시작되면 모든 데이터가 사라집니다. 하지만 실제 많은 애플리케이션(예: 데이터베이스, 파일 업로드 처리 앱)은 상태를 유지해야 합니다. 쿠버네티스는 **PV(Persistent Volume)**와 **PVC(Persistent Volume Claim)**라는 개념을 통해 데이터 영속성을 제공합니다.

*   **Persistent Volume (PV):** 클러스터 관리자가 프로비저닝한 **실제 저장 공간**의 한 조각입니다. NFS, iSCSI, 또는 클라우드 공급자의 스토리지 등 다양한 종류가 될 수 있습니다. `kind`는 노드의 로컬 파일 시스템을 사용하는 기본 스토리지 클래스(`standard`)를 제공합니다.
*   **Persistent Volume Claim (PVC):** 사용자가 PV에 대해 제출하는 **"저장 공간 요청서"**입니다. 사용자는 "1GB의 저장 공간이 필요해요"라고 요청(PVC)하면, 쿠버네티스는 그 조건에 맞는 PV를 찾아 PVC와 연결(bind)해 줍니다.

이 모델은 개발자가 복잡한 스토리지 인프라를 몰라도, 필요한 만큼 저장 공간을 요청하여 사용할 수 있게 해줍니다.

### 1. 데이터 저장을 위한 앱 수정

먼저, 우리 NestJS 앱에 간단한 파일 저장/조회 API를 추가했습니다. (`nest-app/src/app.controller.ts`)

*   `POST /message`: 요청 바디의 `message`를 받아서 파드 내부의 `/data/message.txt` 파일에 저장합니다.
*   `GET /message`: `/data/message.txt` 파일의 내용을 읽어서 반환합니다.

컨테이너 내부의 `/data` 디렉토리에 PVC를 마운트하여, 파드가 재시작되어도 이 파일이 사라지지 않도록 만들 것입니다.

### 2. Helm 차트 수정

데이터 영속성을 활성화하기 위해 Helm 차트를 수정했습니다.

1.  **`values.yaml` 수정:**
    `persistence` 섹션을 추가하여 PVC 관련 설정을 관리할 수 있게 했습니다. 이 값을 `true`로 바꿔야 기능이 활성화됩니다.
    ```yaml
    persistence:
      enabled: false # 이 값을 true로 바꿔야 PVC가 생성됩니다.
      size: 10Mi
      storageClassName: "standard"
    ```

2.  **`templates/pvc.yaml` 추가:**
    `persistence.enabled`가 `true`일 때, 위 `values.yaml`의 설정에 따라 PVC 리소스를 생성하는 템플릿입니다.

3.  **`templates/deployment.yaml` 수정:**
    마찬가지로 `persistence.enabled`가 `true`일 때, Deployment에 `volumeMounts`와 `volumes`를 추가하도록 수정했습니다. 또한, `kind`의 로컬 스토리지 프로비저너가 생성하는 볼륨의 권한 문제로 인해 앱이 쓰기 작업을 수행하지 못하는 경우가 있으므로, `initContainers`를 추가하여 볼륨의 권한을 `777`로 변경하도록 했습니다. 이는 앱 컨테이너가 시작되기 전에 실행되어 볼륨의 권한을 올바르게 설정합니다.
    *   `volumeMounts`: 컨테이너의 `/data` 경로에 볼륨을 연결(마운트)합니다.
    *   `volumes`: 마운트할 볼륨의 소스로, 방금 생성한 PVC(`{{ .Release.Name }}-pvc`)를 사용하겠다고 지정합니다.
    *   `initContainers`: `busybox` 이미지를 사용하여 `chmod -R 777 /data` 명령을 실행, `/data` 디렉토리의 권한을 변경합니다.

### 3. 데이터 영속성 테스트

이제 직접 테스트해 봅시다.

1.  **Helm 업그레이드 (Persistence 활성화):**
    `helm install`을 이미 실행했다면, `helm upgrade` 명령어를 사용하여 `persistence.enabled` 값을 `true`로 변경하여 배포를 업데이트합니다.

    ```bash
    # --set 플래그를 사용하여 values.yaml의 값을 덮어쓸 수 있습니다.
    helm upgrade my-nest-app ./helm/my-nest-app --set persistence.enabled=true
    ```
    *만약 아직 설치하지 않았다면 `install` 명령어를 사용해도 됩니다.*

2.  **`k9s`로 상태 확인:**
    `k9s`를 실행하고 `:pvc`를 입력하여 `my-nest-app-pvc`가 생성되고 `Bound` 상태인지 확인합니다. `:pod`로 이동하여 `my-nest-app-...` 파드를 선택하고 `d`를 눌러(describe) 세부 정보를 보면, `Volumes` 섹션에 PVC가 마운트된 것을 확인할 수 있습니다.

3.  **메시지 저장:**
    `kubectl port-forward`가 실행 중인지 확인하고, `Host` 헤더를 명시하여 메시지를 저장합니다.
    ```bash
    curl -X POST http://127.0.0.1:8080/message -H "Host: my-nest-app.local" -H "Content-Type: application/json" -d '{"message":"Hello Persistent World!"}'
    ```

4.  **메시지 확인:**
    저장된 메시지를 조회합니다.
    ```bash
    curl -H "Host: my-nest-app.local" http://127.0.0.1:8080/message
    # Hello Persistent World! 가 출력되어야 합니다.
    ```

5.  **파드 강제 재시작:**
    이제 이 상태가 정말로 "영속적인지" 확인해 봅시다. `k9s`에서 `my-nest-app-...` 파드를 선택하고 `Ctrl+d`를 눌러 파드를 강제로 삭제합니다. Deployment는 즉시 새로운 파드를 생성할 것입니다.

6.  **다시 메시지 확인:**
    새로운 파드가 `Running` 상태가 되면, 다시 메시지를 조회합니다.
    ```bash
    curl -H "Host: my-nest-app.local" http://127.0.0.1:8080/message
    ```
    파드가 완전히 새로 만들어졌음에도 불구하고, 이전에 저장했던 **"Hello Persistent World!"** 메시지가 그대로 출력되는 것을 확인할 수 있습니다! 데이터가 PVC를 통해 성공적으로 보존된 것입니다.

---

이것으로 쿠버네티스에서 상태를 가진(Stateful) 애플리케이션을 다루는 기초를 배웠습니다. 이 개념은 데이터베이스나 파일 서버 등 다양한 애플리케이션을 쿠버네티스 위에서 운영하는 데 필수적입니다.

**[⬆️ 처음으로 돌아가기](../README.md)**
