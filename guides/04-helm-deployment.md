# 4단계: Helm으로 앱 배포

이제 준비된 컨테이너 이미지를 쿠버네티스 클러스터에 배포할 시간입니다. `kubectl`을 사용하여 `Deployment`, `Service`, `Ingress` YAML 파일을 각각 `apply` 할 수도 있지만, 관련된 리소스들을 하나의 패키지로 관리할 수 있는 **Helm**을 사용하는 것이 훨씬 효율적입니다.

### Helm 차트 구조 분석

프로젝트의 `helm/my-nest-app` 디렉토리가 바로 **Helm 차트**입니다. 그 구조를 살펴보겠습니다.

```
helm/my-nest-app/
├── Chart.yaml          # 차트 정보 (이름, 버전 등)
├── values.yaml         # 설정 값들을 모아놓은 파일 (사용자가 수정)
└── templates/          # 쿠버네티스 리소스 YAML 템플릿 디렉토리
    ├── deployment.yaml # 파드를 어떻게 실행할지 정의
    ├── service.yaml    # 파드들에게 고유한 네트워크 주소를 부여
    └── ingress.yaml    # 외부 요청을 서비스로 연결
```

#### `values.yaml`: 설정 값 저장소

이 파일은 차트의 모든 설정 값을 변수처럼 모아놓은 곳입니다. 사용자는 이 파일만 수정하여 배포 설정을 쉽게 변경할 수 있습니다.

```yaml
# values.yaml
replicaCount: 1

image:
  repository: my-nest-app
  tag: "1.0.0"

service:
  port: 80

ingress:
  enabled: true
  hosts:
    - host: localhost
      # ...
```

*   `replicaCount`: 앱을 몇 개의 파드로 실행할지 결정합니다. (현재는 1개)
*   `image.repository`, `image.tag`: 배포할 Docker 이미지의 이름과 태그를 지정합니다. 우리가 방금 빌드한 이미지와 일치합니다.
*   `service.port`: 클러스터 내부에서 사용할 서비스 포트를 지정합니다.
*   `ingress.enabled`: Ingress 리소스를 생성할지 여부를 결정합니다.

#### `templates/*.yaml`: 리소스 설계도

`templates` 디렉토리의 파일들은 쿠버네티스 리소스의 "템플릿"입니다. 이 템플릿들은 `values.yaml`의 값들을 사용하여 최종 YAML 파일을 생성합니다.

예를 들어, `deployment.yaml`의 일부를 보겠습니다.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }} # Helm이 자동으로 생성하는 릴리스 이름
spec:
  replicas: {{ .Values.replicaCount }} # values.yaml의 replicaCount 값을 사용
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }} # Chart.yaml의 차트 이름을 사용
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}" # values.yaml의 이미지 정보를 사용
```

*   `{{ .Values.replicaCount }}`: Helm은 이 부분을 `values.yaml` 파일에 있는 `replicaCount`의 값(현재는 `1`)으로 치환합니다.
*   `{{ .Values.image.repository }}`: `my-nest-app`으로 치환됩니다.
*   `{{ .Release.Name }}`: `helm install` 시 지정하는 릴리스 이름으로 치환됩니다.

이런 방식으로 Helm은 템플릿과 설정 값을 조합하여, 재사용 가능하고 관리하기 쉬운 쿠버네티스 애플리케이션 패키지를 만듭니다.

### Helm으로 배포하기

이제 Helm 명령어로 우리 앱을 클러스터에 배포해 봅시다.

```bash
# helm install <릴리스_이름> <차트_경로>
helm install my-nest-app ./helm/my-nest-app
```

*   `my-nest-app`: 이번 배포를 식별하는 **릴리스(Release)** 이름입니다. 이 이름으로 나중에 업그레이드하거나 삭제할 수 있습니다.
*   `./helm/my-nest-app`: 우리가 만든 Helm 차트가 위치한 경로입니다.

명령을 실행하면, Helm은 `templates` 폴더의 템플릿들과 `values.yaml`을 조합하여 최종 쿠버네티스 YAML을 생성하고, 이를 클러스터의 API 서버로 전송합니다.

### 배포 상태 확인하기 (`k9s`)

배포가 잘 되었는지 확인하는 가장 좋은 방법은 `k9s`를 사용하는 것입니다.

1.  `k9s`를 실행합니다: `k9s`
2.  **파드(Pod) 확인:** `:pod`를 입력하고 엔터를 칩니다. `my-nest-app-...`으로 시작하는 파드가 생성되고, 잠시 후 `Running` 상태가 되는 것을 볼 수 있습니다. 이 파드는 2개의 Worker Node 중 하나에 배치됩니다. `NODE` 컬럼에서 어느 워커 노드에 있는지 확인해보세요.
3.  **디플로이먼트(Deployment) 확인:** `:deploy`를 입력합니다. `my-nest-app`이라는 Deployment가 생성되었고, `READY` 상태가 `1/1`인지 확인합니다.
4.  **서비스(Service) 확인:** `:svc`를 입력합니다. `my-nest-app` 서비스가 생성되었습니다.
5.  **인그레스(Ingress) 확인:** `:ing`를 입력합니다. `my-nest-app` Ingress가 생성되었고, `HOSTS`가 `localhost`로 설정된 것을 확인합니다.

`k9s`를 통해 우리는 방금 배포한 애플리케이션을 구성하는 모든 리소스들이 정상적으로 생성되고 동작하고 있음을 한눈에 파악할 수 있습니다.

---

이제 애플리케이션은 클러스터 위에서 열심히 실행되고 있습니다. 마지막 단계는 외부에서 이 애플리케이션에 접속하는 것입니다.

**➡️ [다음: 5단계 - 외부 접속 및 정리](./05-access-and-cleanup.md)**
