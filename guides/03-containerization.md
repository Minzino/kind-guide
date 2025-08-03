# 3단계: NestJS 앱 컨테이너화

쿠버네티스는 컨테이너화된 애플리케이션을 실행하는 시스템입니다. 따라서 우리의 NestJS 애플리케이션을 먼저 **Docker 이미지**라는 패키지로 만들어야 합니다.

### `Dockerfile` 분석

`nest-app` 디렉토리 안에 있는 `Dockerfile`은 애플리케이션을 이미지로 만들기 위한 레시피입니다. 이 파일은 두 단계로 구성된 **멀티-스테이지 빌드(Multi-stage build)** 방식을 사용합니다. 이는 최종 이미지 크기를 줄여 효율성을 높이는 좋은 방법입니다.

```dockerfile
# Dockerfile for NestJS App

# 1. Build the application (빌드 단계)
FROM node:18 as builder
WORKDIR /app

# 소스코드보다 먼저 package.json을 복사하여 의존성 캐싱 활용
COPY package.json tsconfig.json ./
RUN npm install

# 전체 소스코드 복사 및 빌드
COPY src ./src
RUN npm run build # tsconfig.json에 따라 TypeScript를 JavaScript로 컴파일

# 2. Create the final, smaller image (최종 이미지 생성 단계)
FROM node:18-alpine
WORKDIR /app

# 빌드 단계에서 생성된 결과물만 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 컨테이너가 시작될 때 실행할 명령어
CMD ["node", "dist/main.js"]
```

*   **`FROM node:18 as builder`**: 첫 번째 단계(이름: `builder`)를 시작합니다. `node:18` 이미지를 기반으로 하며, 여기에는 TypeScript 컴파일러 등 개발에 필요한 모든 도구가 포함되어 있습니다.
*   **`RUN npm install`**: 의존성을 설치합니다.
*   **`RUN npm run build`**: `package.json`의 `scripts`에 정의된 `build` 명령(실제로는 `tsc`)을 실행하여 `src` 디렉토리의 TypeScript 코드를 `dist` 디렉토리의 JavaScript 코드로 컴파일합니다.
*   **`FROM node:18-alpine`**: 두 번째, 최종 이미지를 만드는 단계를 시작합니다. `alpine` 버전은 훨씬 가벼운 최소한의 OS 이미지이므로 최종 이미지 크기가 작아집니다.
*   **`COPY --from=builder ...`**: `builder` 단계에서 컴파일된 `dist` 폴더와, 실행에 필요한 `node_modules` 폴더만 최종 이미지로 복사합니다. TypeScript 소스코드나 개발용 의존성은 포함되지 않아 이미지가 깨끗하고 가벼워집니다.
*   **`CMD ["node", "dist/main.js"]`**: 이 이미지로 컨테이너를 시작할 때 `node dist/main.js` 명령어를 실행하여 애플리케이션을 구동합니다.

### Docker 이미지 빌드 및 로드

1.  **이미지 빌드**

    이제 이 `Dockerfile`을 사용하여 실제로 이미지를 빌드합니다. `-t` 옵션은 이미지에 `이름:태그` 형식으로 이름을 붙이는 역할을 합니다.

    ```bash
    # -t my-nest-app:1.0.0 은 이미지에 my-nest-app:1.0.0 이라는 태그를 붙입니다.
    # ./nest-app 은 Dockerfile이 위치한 경로입니다.
    docker build -t my-nest-app:1.0.0 ./nest-app
    ```

    빌드가 완료되면 `docker images` 명령어로 로컬에 `my-nest-app:1.0.0` 이미지가 생성된 것을 확인할 수 있습니다.

2.  **`kind` 클러스터에 이미지 로드**

    **매우 중요한 단계입니다.** 로컬 머신에서 빌드한 Docker 이미지는 아직 `kind` 클러스터(즉, Docker 안의 다른 컨테이너들)에서는 보이지 않습니다. `kind`에게 이 이미지를 사용하라고 알려주려면, 이미지를 클러스터 내부로 "로드"해야 합니다.

    ```bash
    # --name 플래그로 이미지를 로드할 클러스터를 지정합니다.
    kind load docker-image my-nest-app:1.0.0 --name nest-app-cluster
    ```

    이 명령은 로컬의 `my-nest-app:1.0.0` 이미지를 `kind` 클러스터를 구성하는 모든 노드(Control Plane 1개, Worker 2개)에 복사합니다. 이제 쿠버네티스는 이 이미지를 사용하여 파드를 생성할 수 있습니다.

---

이제 우리의 애플리케이션은 쿠버네티스가 이해할 수 있는 "컨테이너 이미지"라는 형태로 준비되었습니다. 다음 단계에서는 Helm을 사용하여 이 이미지를 클러스터에 배포해 보겠습니다.

**➡️ [다음: 4단계 - Helm으로 앱 배포](./04-helm-deployment.md)**
