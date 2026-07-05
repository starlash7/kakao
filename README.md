# Kakao MCP Services

AGENTIC PLAYER 10 제출용 MCP 서버 2종입니다.

- `연차 마법사`: 연차와 공휴일을 조합해 최장 연휴를 계산합니다.
- `우리 아이 학교`: NEIS API로 급식, 학사일정, 시간표를 조회합니다.

## Local Run

```bash
npm install
npm run start:annual-leave
npm run start:school
```

두 서버 모두 `POST /mcp`를 MCP 엔드포인트로 사용하고, `GET /health`를 제공합니다.

## Environment

학교 MCP는 배포 환경에 나이스 인증키가 필요합니다.

```bash
NEIS_API_KEY=...
```

키가 없으면 도구 호출은 실패하지 않고 환경변수 설정 안내를 반환합니다.

## KakaoCloud

PlayMCP in KC에서 Git 소스 빌드로 각각 등록합니다.

공통 입력값:

```text
Git URL: https://github.com/starlash7/kakao.git
브랜치 / ref: main
PAT: 비워둠
```

| 서비스 | 서버 이름 | Dockerfile |
| --- | --- | --- |
| 연차 마법사 | `annual-leave-mcp` | `Dockerfile.annual-leave` |
| 우리 아이 학교 | `school-life-mcp` | `Dockerfile.school` |

학교 MCP는 서버 설정에서 아래 환경변수를 추가해야 실제 NEIS 조회가 됩니다.

```text
NEIS_API_KEY=발급받은_나이스_API키
```

빌드가 완료되면 각 상세 페이지의 Endpoint URL을 PlayMCP 개발자 콘솔에 등록합니다.

배포 확인:

```text
{Endpoint URL}/health
```

정상 응답:

```json
{"ok":true,"service":"annual-leave"}
```

```json
{"ok":true,"service":"school-life"}
```

PlayMCP에 등록할 MCP Endpoint는 health URL이 아니라 아래 형식입니다.

```text
{Endpoint URL}/mcp
```

## Deployment Notes

- GitHub 저장소는 KakaoCloud 빌더가 클론할 수 있도록 public 상태여야 합니다. private 저장소를 쓰면 PAT가 필요합니다.
- `fatal: could not read Username for 'https://github.com'` 에러는 GitHub 저장소 접근 권한 문제입니다.
- `Starting` 상태에서는 Endpoint URL과 Tool 목록이 아직 비어 있을 수 있습니다. Active 상태가 된 뒤 확인합니다.
- PlayMCP 등록 화면에서는 대표 이미지가 필수입니다. 600x600 이상 png/jpg/jpeg/gif 이미지를 사용합니다.
- API 키는 코드, README, GitHub에 커밋하지 말고 KakaoCloud 환경변수에만 입력합니다.

## PlayMCP

서비스명:

- `연차 마법사`
- `우리 아이 학교`

스타터 질문:

- 올해 남은 연차 3개로 최장 연휴 만들어줘
- 10월에 연차 3개 쓰면 최대 며칠 쉬어?
- 서울대치초등학교 오늘 급식 뭐야?
- 내일 3학년 2반 시간표 알려줘

비즈니스폼 소개문:

> 카톡에서 바로 쓰는 생활형 MCP 2종입니다. 연차 마법사는 최장 연휴를 계산하고, 우리 아이 학교는 나이스 기반 급식·일정·시간표를 조회합니다.
