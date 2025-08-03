# 2단계: 다중 노드 클러스터 생성

이제 `kind`를 사용하여 로컬에 쿠버네티스 클러스터를 생성할 차례입니다. 우리는 실제 운영 환경과 유사하게 **Control Plane 1개**와 **Worker Node 2개**로 구성된 다중 노드 클러스터를 만들 것입니다.

### `kind-config.yaml` 파일 분석

클러스터를 생성하기 전에, 프로젝트 루트에 있는 `kind-config.yaml` 파일을 살펴보겠습니다. 이 파일은 `kind`에게 우리가 어떤 모양의 클러스터를 원하는지 알려주는 설계도와 같습니다.

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  # 1. Control Plane 노드 설정
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"

  # 2. Worker 노드 설정 (1)
  - role: worker

  # 3. Worker 노드 설정 (2)
  - role: worker
```

*   `nodes`: 클러스터를 구성할 노드들의 목록입니다.
*   `role: control-plane`: 이 노드가 **Control Plane**임을 지정합니다. Control Plane은 클러스터의 전체 상태를 관리하고 조율하는 "뇌"와 같은 역할을 합니다. 모든 `kubectl` 명령은 이 노드의 API 서버와 통신합니다.
*   `role: worker`: 이 노드들이 **Worker Node**임을 지정합니다. Worker Node는 실제 애플리케이션 컨테이너(파드)가 배치되고 실행되는 "일꾼"입니다. 우리는 2개의 Worker Node를 두어, 애플리케이션이 분산되어 실행되는 모습을 볼 수 있습니다.
*   `node-labels: "ingress-ready=true"`: Control Plane 노드에 `ingress-ready=true`라는 라벨을 붙입니다. 잠시 후에 설치할 Ingress Controller가 이 라벨을 보고 자신이 실행될 위치를 결정하게 됩니다.

> ⚠️ **주의:** `kind`의 `extraPortMappings`는 Ingress Controller와 함께 사용할 때 불안정한 경우가 많습니다. 따라서 이 가이드에서는 `extraPortMappings`를 제거하고, `kubectl port-forward`를 사용하여 Ingress Controller에 접근하는 방식을 사용합니다. 이 방식이 더 안정적입니다.

### 클러스터 생성 및 확인

1.  **클러스터 생성**

    이제 이 설정 파일을 사용하여 클러스터를 생성합니다. `--name` 플래그로 클러스터에 식별하기 쉬운 이름을 붙여줍니다.

    ```bash
    kind create cluster --name nest-app-cluster --config kind-config.yaml
    ```

    이 과정은 몇 분 정도 소요될 수 있습니다. `kind`는 백그라운드에서 Docker 컨테이너 3개(Control Plane 1, Worker 2)를 다운로드하고 실행하여 쿠버네티스 클러스터를 구성합니다.

2.  **클러스터 확인 (`kubectl` & `k9s`)**

    클러스터가 잘 생성되었는지 확인해 봅시다.

    *   **`kubectl` 사용:**
        ```bash
        # kubectl에게 방금 만든 클러스터를 사용하도록 설정
        kubectl cluster-info --context kind-nest-app-cluster

        # 클러스터의 모든 노드 목록 확인
        kubectl get nodes
        ```
        결과를 보면 `control-plane` 역할을 가진 노드 1개와 `worker` 역할을 가진 노드 2개가 보일 것입니다.

    *   **`k9s` 사용:**
        이제 `k9s`를 실행할 차례입니다! 터미널에 `k9s`를 입력하세요.
        ```bash
        k9s
        ```
        `k9s` 화면이 나타나면, `:node`를 입력하고 엔터를 쳐보세요. `kubectl get nodes`와 동일한 결과를 훨씬 보기 좋은 UI로 확인할 수 있습니다. (종료는 `Ctrl+C`)

### Ingress Controller 설치 및 포트 포워딩

클러스터는 준비되었지만, 아직 외부 요청을 내부 서비스로 연결해 줄 "교통 경찰"이 없습니다. 이 역할을 하는 것이 **Ingress Controller**입니다. 우리는 NGINX Ingress Controller를 사용할 것입니다.

1.  **NGINX Ingress Controller 배포**

    ```bash
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    ```

    이 명령어는 Ingress Controller에 필요한 모든 쿠버네티스 리소스(Deployment, Service, ConfigMap 등)를 한 번에 생성합니다.

2.  **설치 확인**

    설치가 완료될 때까지 잠시 기다려야 합니다. 아래 명령어로 Ingress Controller 파드가 `Running` 상태가 될 때까지 기다릴 수 있습니다.

    ```bash
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=120s
    ```

    `k9s`를 실행하고 `:pod -n ingress-nginx`를 입력하면 `ingress-nginx-controller-...` 파드가 생성되고 실행되는 과정을 실시간으로 볼 수 있습니다.

3.  **Ingress Controller 포트 포워딩**

    `kind` 클러스터는 Docker 컨테이너 내부에서 실행되므로, 로컬 머신에서 직접 접근하기 어렵습니다. `kubectl port-forward` 명령어를 사용하여 Ingress Controller의 80번 포트를 로컬 머신의 특정 포트(예: 8080)로 연결합니다.

    먼저 Ingress Controller 파드의 이름을 확인합니다.
    ```bash
    kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o name
    # 예시 출력: pod/ingress-nginx-controller-xxxxxxxxxx-yyyyy
    ```

    이제 포트 포워딩을 백그라운드에서 실행합니다. (터미널을 닫아도 유지되도록 `&` 사용)
    ```bash
    # 위에서 확인한 파드 이름을 사용하여 포워딩
    kubectl port-forward -n ingress-nginx pod/<YOUR_INGRESS_CONTROLLER_POD_NAME> 8080:80 &
    ```
    > 💡 **팁:** `8080:80`은 로컬 머신의 8080번 포트를 클러스터 내부의 Ingress Controller 80번 포트로 연결한다는 의미입니다. 80번 포트는 일반적으로 관리자 권한이 필요하므로, 8080번 포트를 사용하는 것이 편리합니다.

4.  **로컬 hosts 파일 설정 (선택 사항이지만 권장)**

    우리가 배포할 NestJS 앱의 Ingress는 `my-nest-app.local`이라는 호스트 이름을 사용하도록 설정되어 있습니다. 로컬 머신에서 이 호스트 이름으로 접속하려면 `/etc/hosts` 파일에 다음 줄을 추가해야 합니다.

    ```
    127.0.0.1 my-nest-app.local
    ```
    이 작업은 관리자 권한이 필요하며, 텍스트 편집기로 `/etc/hosts` 파일을 열어 직접 추가해야 합니다.

---


이제 애플리케이션을 배포할 준비가 된, 다중 노드를 갖춘 멋진 쿠버네티스 클러스터가 완성되었습니다.

**➡️ [다음: 3단계 - NestJS 앱 컨테이너화](./03-containerization.md)**
