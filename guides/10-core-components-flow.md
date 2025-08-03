# 10단계 (심화): 쿠버네티스 코어 컴포넌트 흐름 이해하기

쿠버네티스 클러스터는 여러 핵심 컴포넌트들이 유기적으로 상호작용하며 동작합니다. 이 가이드에서는 클러스터의 "뇌" 역할을 하는 **컨트롤 플레인(Control Plane)**과 실제 작업을 수행하는 **워커 노드(Worker Node)**의 주요 컴포넌트들이 어떻게 협력하여 애플리케이션을 배포하고 관리하는지 그 흐름을 자세히 살펴봅니다.

### 쿠버네티스 코어 컴포넌트

#### 컨트롤 플레인 (Control Plane)
클러스터의 "뇌" 역할을 하며, 클러스터의 전반적인 상태를 관리하고 조율합니다. 우리 `kind` 클러스터에서는 `nest-app-cluster-control-plane` 노드에서 실행됩니다.

*   **Kube-apiserver**: 쿠버네티스 API를 노출하는 컴포넌트입니다. 모든 `kubectl` 명령이나 다른 컴포넌트들은 `kube-apiserver`를 통해 클러스터와 통신합니다. 클러스터의 모든 통신은 이 API 서버를 거칩니다.
*   **etcd**: 클러스터의 모든 데이터를 저장하는 **분산형 키-값 저장소**입니다. 클러스터의 현재 상태, 설정, 메타데이터 등 모든 정보가 여기에 저장됩니다. `etcd`가 없으면 클러스터는 작동할 수 없습니다.
*   **Kube-scheduler**: 새로 생성된 파드를 실행할 적절한 노드를 선택하는 컴포넌트입니다. 파드의 리소스 요구사항, 노드의 가용 리소스, 정책, 어피니티/안티-어피니티 등을 고려하여 최적의 노드를 결정합니다.
*   **Kube-controller-manager**: 다양한 컨트롤러들을 실행하는 컴포넌트입니다. 각 컨트롤러는 클러스터의 "실제 상태"를 "원하는 상태"로 유지하기 위해 지속적으로 모니터링하고 조정합니다. (예: `Deployment` 컨트롤러는 파드 개수를 유지)

#### 워커 노드 (Worker Node)
클러스터의 "일꾼" 역할을 하며, 실제 애플리케이션(파드)이 실행되는 곳입니다. 우리 `kind` 클러스터에서는 `nest-app-cluster-worker`와 `nest-app-cluster-worker2` 노드에서 실행됩니다.

*   **Kubelet**: 각 노드에서 실행되는 에이전트입니다. `kube-apiserver`로부터 파드 스펙을 받아 컨테이너 런타임(Docker 등)을 통해 파드를 실행하고, 파드의 상태를 `kube-apiserver`에 보고합니다.
*   **Kube-proxy**: 각 노드에서 실행되는 네트워크 프록시입니다. 쿠버네티스 서비스에 대한 네트워크 규칙을 관리하여, 클러스터 내부 또는 외부에서 서비스로 접근할 수 있도록 네트워크 트래픽을 라우팅합니다.
*   **Container Runtime**: 컨테이너 이미지를 실행하는 소프트웨어입니다. (예: Docker, containerd, CRI-O) `kubelet`의 지시를 받아 컨테이너를 시작하고 중지합니다.

### 쿠버네티스 컴포넌트 상호작용 흐름

아래 다이어그램은 사용자의 요청이 어떻게 최종적으로 앱 컨테이너까지 도달하는지, 그리고 파드 배포 과정에서 주요 컴포넌트들이 어떻게 상호작용하는지 그 흐름을 보여줍니다.

```mermaid
graph TD
    subgraph "사용자 요청 흐름"
        A[사용자 (Local Machine)] --> B{kubectl port-forward 8080:80}
        B --> C[Ingress Controller]
        C -- "Ingress Rule" --> D(Service: my-nest-app)
        D -- "Load Balances" --> E[Pod: my-nest-app]
        E -- "Container Port 3000" --> F[Container: NestJS App]
    end

    subgraph "파드 배포 흐름"
        G[사용자/컨트롤러] -- "kubectl apply (Deployment)" --> H(Kube-apiserver)
        H -- "Stores State" --> I[etcd]
        H -- "Notifies" --> J[Kube-scheduler]
        J -- "Schedules Pod" --> K[Kubelet (on Worker Node)]
        K -- "Manages Container" --> L[Container Runtime]
        L -- "Runs" --> E
        K -- "Reports Status" --> H
    end

    subgraph "네트워크 프록시"
        M[Kube-proxy (on Worker Node)] -- "Manages Network Rules" --> E
    end

    style A fill:#f9f7d9,stroke:#333,stroke-width:2px
    style B fill:#c2f0c2,stroke:#333,stroke-width:2px
    style C fill:#add8e6,stroke:#333,stroke-width:2px
    style D fill:#add8e6,stroke:#333,stroke-width:2px
    style E fill:#d3f8d3,stroke:#333,stroke-width:2px
    style F fill:#d3f8d3,stroke:#333,stroke-width:2px
    style G fill:#f9f7d9,stroke:#333,stroke-width:2px
    style H fill:#add8e6,stroke:#333,stroke-width:2px
    style I fill:#add8e6,stroke:#333,stroke-width:2px
    style J fill:#add8e6,stroke:#333,stroke-width:2px
    style K fill:#90ee90,stroke:#333,stroke-width:2px
    style L fill:#90ee90,stroke:#333,stroke-width:2px
    style M fill:#90ee90,stroke:#333,stroke-width:2px
```

### 단계별 흐름 설명

#### 1. 애플리케이션 배포 과정

1.  **`kubectl apply` (또는 `helm install/upgrade`)**: 사용자가 `Deployment`와 같은 리소스 정의를 `kube-apiserver`에 제출합니다.
2.  **`Kube-apiserver`**: 이 요청을 받아 유효성을 검사하고, 클러스터의 상태를 저장하는 `etcd`에 해당 정보를 기록합니다.
3.  **`Kube-controller-manager`**: `Deployment` 컨트롤러는 `kube-apiserver`를 통해 새로운 `Deployment`가 생성된 것을 감지하고, 원하는 파드 개수를 유지하기 위해 `ReplicaSet`을 생성합니다.
4.  **`Kube-scheduler`**: `kube-apiserver`를 통해 새로 생성된 파드(아직 노드에 할당되지 않은)를 감지합니다. 스케줄러는 클러스터 내의 노드 상태(CPU, 메모리 가용량 등)를 고려하여 파드를 실행할 최적의 워커 노드를 선택하고, 이 정보를 `kube-apiserver`에 업데이트합니다.
5.  **`Kubelet`**: 파드가 할당된 워커 노드에서 실행되는 `kubelet`은 `kube-apiserver`를 통해 자신에게 할당된 파드가 있음을 감지합니다. `kubelet`은 해당 파드의 컨테이너를 실행하기 위해 노드의 `Container Runtime`에 지시합니다.
6.  **`Container Runtime`**: `kubelet`의 지시에 따라 Docker와 같은 컨테이너 런타임은 파드 내의 컨테이너 이미지를 다운로드하고 실행합니다.
7.  **`Kubelet` (상태 보고)**: `kubelet`은 파드의 실행 상태(Running, Ready 등)를 지속적으로 모니터링하고, 이 상태 정보를 `kube-apiserver`에 보고하여 `etcd`에 반영되도록 합니다.

#### 2. 외부에서 애플리케이션 접근 과정

1.  **사용자 요청**: 사용자가 웹 브라우저나 `curl`을 통해 `http://my-nest-app.local:8080`과 같은 주소로 요청을 보냅니다.
2.  **`kubectl port-forward`**: 로컬 머신의 8080번 포트로 들어온 요청은 `kubectl port-forward` 명령에 의해 쿠버네티스 클러스터 내부의 Ingress Controller 파드의 80번 포트로 전달됩니다.
3.  **`Ingress Controller`**: Ingress Controller는 요청을 받아 `Ingress` 리소스에 정의된 규칙을 확인합니다. 요청의 `Host` 헤더(`my-nest-app.local`)와 경로(`/`)를 기반으로 어떤 서비스로 요청을 라우팅할지 결정합니다.
4.  **`Kube-proxy`**: 각 워커 노드에서 실행되는 `kube-proxy`는 `Service`에 대한 네트워크 규칙을 관리합니다. Ingress Controller가 특정 `Service`로 요청을 보내면, `kube-proxy`는 해당 `Service`에 속한 파드들 중 하나로 요청을 로드 밸런싱하여 전달합니다.
5.  **애플리케이션 파드**: 최종적으로 요청은 `my-nest-app` 파드 내의 NestJS 앱 컨테이너에 도달하고, 앱은 요청을 처리한 후 응답을 반환합니다. 응답은 역순으로 Ingress Controller를 거쳐 사용자에게 전달됩니다.

---

이것으로 쿠버네티스 클러스터의 핵심 컴포넌트들이 어떻게 상호작용하며 애플리케이션의 배포와 접근을 가능하게 하는지 이해했습니다.

**[⬆️ 처음으로 돌아가기](../README.md)**
