# 5단계: 외부 접속 및 정리

지금까지의 과정을 통해 우리의 NestJS 애플리케이션은 `kind` 클러스터의 Worker Node 위에서 실행되고 있습니다. 이제 마지막으로 로컬 머신에서 이 앱에 접속해 보겠습니다.

### 접속 흐름 이해하기

외부에서 접속이 어떻게 이루어지는지 흐름을 이해하는 것이 중요합니다.

1.  **사용자 (로컬 머신)**: 웹 브라우저나 `curl`로 `http://my-nest-app.local:8080`에 요청을 보냅니다.
2.  **`kubectl port-forward`**: 로컬 머신의 8080번 포트로 들어온 요청은 `kubectl port-forward`에 의해 Ingress Controller 파드의 80번 포트로 전달됩니다.
3.  **Ingress Controller (NGINX)**: Ingress Controller는 `Ingress` 리소스의 규칙을 확인합니다. 이때 요청의 `Host` 헤더(`my-nest-app.local`)를 기반으로 라우팅 규칙을 찾습니다.
4.  **Ingress 규칙**: `my-nest-app` Ingress는 `my-nest-app.local`로 들어온 요청을 `my-nest-app`이라는 `Service`로 보내라고 정의하고 있습니다.
5.  **Service**: `my-nest-app` Service는 자신에게 연결된 파드들, 즉 `my-nest-app-...` 파드의 내부 IP 주소와 포트(3000번)로 요청을 최종 전달(로드 밸런싱)합니다.
6.  **애플리케이션 파드**: 마침내 요청이 NestJS 앱에 도달하고, 앱은 "Hello World!"를 응답으로 보냅니다. 이 응답은 역순으로 사용자에게 다시 전달됩니다.

### 접속 확인

`kubectl port-forward`가 백그라운드에서 실행 중인지 확인하세요. (만약 실행 중이 아니라면 `2단계: 다중 노드 클러스터 생성`의 3번 항목을 다시 수행하세요.)

1.  **`/etc/hosts` 파일 설정 (권장)**

    가장 편리한 방법은 로컬 머신의 `/etc/hosts` 파일에 다음 줄을 추가하는 것입니다. 이렇게 하면 `my-nest-app.local`이라는 도메인으로 `127.0.0.1`에 접속할 수 있게 됩니다.

    ```
    127.0.0.1 my-nest-app.local
    ```
    이 작업은 관리자 권한이 필요하며, 텍스트 편집기로 `/etc/hosts` 파일을 열어 직접 추가해야 합니다.

    추가 후, 터미널에서 아래 `curl` 명령어를 실행하여 직접 확인해 봅시다.

    ```bash
    curl http://my-nest-app.local:8080
    ```

2.  **`Host` 헤더 명시 (대체 방법)**

    `/etc/hosts` 파일을 수정하기 어렵거나 원치 않는다면, `curl` 명령에서 `Host` 헤더를 명시적으로 지정하여 접속할 수 있습니다.

    ```bash
    curl -H "Host: my-nest-app.local" http://127.0.0.1:8080
    ```

"Hello World! Welcome to the persistence test." 라는 응답이 성공적으로 출력된다면, 전체 배포 사이클을 완벽하게 마스터한 것입니다!

웹 브라우저에서 `http://my-nest-app.local:8080` 주소로 접속해도 동일한 결과를 볼 수 있습니다.

### 정리하기: 클러스터 삭제

`kind`의 가장 큰 장점 중 하나는 클러스터를 빠르고 깨끗하게 삭제할 수 있다는 것입니다. 더 이상 클러스터가 필요 없다면 아래 명령어로 모든 리소스(Docker 컨테이너, 네트워크 설정 등)를 한 번에 삭제할 수 있습니다.

```bash
# --name 플래그로 삭제할 클러스터를 지정합니다.
kind delete cluster --name nest-app-cluster
```

이 명령어를 실행하면 `kind` 클러스터를 구성하던 모든 Docker 컨테이너가 중지되고 삭제됩니다. `docker ps -a` 명령어로 확인해 보면 `kind` 관련 컨테이너들이 사라진 것을 볼 수 있습니다.

---

## 🎉 축하합니다!

이것으로 `kind`를 사용하여 로컬에 다중 노드 쿠버네티스 클러스터를 구축하고, 애플리케이션을 컨테이너화하여 Helm으로 배포한 뒤, 외부 접속까지 성공적으로 완료했습니다.

**이번 여정에서 배운 핵심 개념들:**

*   **Control Plane vs Worker Node**: 클러스터의 뇌와 일꾼의 역할을 이해했습니다.
*   **`kind`**: Docker를 이용해 실제와 유사한 다중 노드 클러스터를 빠르고 쉽게 만들고 없앨 수 있습니다.
*   **`k9s`**: `kubectl`의 어려움을 덜어주는 강력한 TUI 도구로 클러스터를 쉽게 탐색할 수 있습니다.
*   **Ingress**: 외부 요청을 클러스터 내부로 연결하는 관문(Gateway)의 중요성을 배웠습니다.
*   **Helm**: 복잡한 쿠버네티스 리소스를 `Chart`와 `values.yaml`을 통해 템플릿화하여 효율적으로 관리할 수 있습니다.

이제 친구분은 이 프로젝트를 기반으로 자신의 NestJS 애플리케이션을 배포해보거나, `values.yaml`의 `replicaCount`를 2개로 늘려 파드가 Worker Node들에 분산 배포되는 모습을 `k9s`로 관찰하는 등 다양한 실험을 해볼 수 있습니다.

**[⬆️ 처음으로 돌아가기](../README.md)**