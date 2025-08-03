# kind 가이드

로컬 쿠버네티스(kind) 환경 구축 및 애플리케이션 배포 가이드입니다.

## 🚀 최종 목표

1.  **다중 노드(Multi-node)** 쿠버네티스 클러스터를 로컬에 구축한다.
2.  `k9s`를 사용하여 클러스터 상태를 직관적으로 모니터링한다.
3.  샘플 NestJS 애플리케이션을 컨테이너화하고, **데이터를 영속적으로 저장(PV/PVC)**한다.
4.  `Helm`을 사용해 애플리케이션을 쿠버네티스에 배포한다.
5.  외부(로컬 머신)에서 애플리케이션에 접속한다.
6.  **환경 변수, ConfigMap, Secret**을 사용하여 애플리케이션 설정을 관리한다.
7.  **RBAC**를 통해 쿠버네티스 리소스 접근 권한을 제어한다.
8.  실습 과정에서 사용된 쿠버네티스의 **핵심 개념**을 명확히 이해한다.

---

## 📖 가이드 맵

이 가이드는 각 단계별로 상세한 설명을 담은 별도의 문서로 구성되어 있습니다.

*   **[1단계: 준비물 & k9s 설치](./guides/01-installation.md)**
*   **[2단계: 다중 노드 클러스터 생성](./guides/02-cluster-creation.md)**
*   **[3단계: NestJS 앱 컨테이너화](./guides/03-containerization.md)**
*   **[4단계: Helm으로 앱 배포](./guides/04-helm-deployment.md)**
*   **[5단계: 외부 접속 및 정리](./guides/05-access-and-cleanup.md)**
*   **[6단계: 데이터 영속성 (PV & PVC)](./guides/06-persistence-pv-pvc.md)**
*   **[7단계: 설정 관리 (환경 변수, ConfigMap, Secret)](./guides/08-config-and-secrets.md)**
*   **[8단계: RBAC 심화 학습](./guides/09-rbac-deep-dive.md)**
*   **[9단계: 쿠버네티스 코어 컴포넌트 흐름 이해하기](./guides/10-core-components-flow.md)**
*   **[개념 정리: 쿠버네티스 핵심 요소 다시보기](./guides/07-core-concepts-deep-dive.md)** 👈 **마지막에 읽어보세요!**

---

## 🏃‍♂️ 빠른 시작 (Quick Start)

이미 개념에 익숙하다면 아래 명령어로 빠르게 시작할 수 있습니다.

1.  **클러스터 생성:**
    ```bash
    # kind-config.yaml 파일에서 extraPortMappings를 제거했습니다.
    kind create cluster --name nest-app-cluster --config kind-config.yaml
    ```

2.  **Ingress Controller 설치 및 포트 포워딩:**
    ```bash
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s
    # Ingress Controller 파드 이름 확인 (예: ingress-nginx-controller-xxxxxxxxxx-yyyyy)
    # kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o name
    # 로컬 8080 포트로 포워딩 (백그라운드 실행)
    # kubectl port-forward -n ingress-nginx pod/<YOUR_INGRESS_CONTROLLER_POD_NAME> 8080:80 &
    ```

3.  **Docker 이미지 빌드 및 로드:**
    ```bash
    docker build -t my-nest-app:1.0.0 ./nest-app
    kind load docker-image my-nest-app:1.0.0 --name nest-app-cluster
    ```

4.  **Helm 배포:**
    ```bash
    helm install my-nest-app ./helm/my-nest-app
    ```

5.  **접속 확인:**
    ```bash
    # /etc/hosts 파일에 "127.0.0.1 my-nest-app.local" 추가 후
    curl http://my-nest-app.local:8080
    # 또는 Host 헤더를 명시하여 접속
    # curl -H "Host: my-nest-app.local" http://127.0.0.1:8080
    ```

6.  **클러스터 삭제:**
    ```bash
    kind delete cluster --name nest-app-cluster
    ```
