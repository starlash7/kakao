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

학교 MCP는 NEIS 공개 조회를 기본으로 사용합니다. 더 안정적인 운영이 필요하면 배포 환경에 나이스 인증키를 설정할 수 있습니다.

```bash
NEIS_API_KEY=...
```

키가 없으면 `KEY` 파라미터 없이 NEIS API를 호출합니다.

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
| 연차 마법사 | `annual-leave-mcp-v6` | `Dockerfile` 또는 `Dockerfile.annual-leave` |
| 우리 아이 학교 | `school-life-mcp-v3` | `Dockerfile.school` |

현재 배포된 MCP Endpoint:

```text
연차 마법사: https://annual-leave-mcp-v6.playmcp-endpoint.kakaocloud.io/mcp
우리 아이 학교: https://school-life-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp
```

학교 MCP는 NEIS 인증키 없이도 기본 조회가 됩니다. 더 안정적인 운영이 필요하면 서버 설정에서 아래 환경변수를 추가할 수 있습니다.

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

등록 입력값:

| 항목 | 연차 마법사 | 우리 아이 학교 |
| --- | --- | --- |
| MCP 이름 | `연차 마법사` | `우리 아이 학교` |
| MCP 식별자 | `leaveWizard` | `schoolLife` |
| 인증 방식 | 인증 사용하지 않음 | 인증 사용하지 않음 |
| MCP Endpoint | `https://annual-leave-mcp-v6.playmcp-endpoint.kakaocloud.io/mcp` | `https://school-life-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp` |

현재 상태:

- `연차 마법사`: KakaoCloud `annual-leave-mcp-v6` Active, PlayMCP tool call 테스트 성공
- `우리 아이 학교`: KakaoCloud `school-life-mcp-v3` Active, PlayMCP tool call 테스트 성공
- 반려 사유였던 tool `annotations`와 description 내 서비스명 포함 여부는 새 endpoint의 `tools/list` 응답으로 확인했습니다.
- 심사 승인 후 공개 상태를 `전체 공개`로 변경하고 비즈니스폼을 제출해야 합니다.

검증한 PlayMCP 질문:

- `2026년 10월 6일, 7일, 8일에 연차 쓰면 며칠 연속 쉬어?`
- `한영외고 오늘 급식메뉴 알려줘`

설명:

```text
연차 마법사
남은 연차와 공휴일을 조합해 가장 긴 연휴를 찾아주는 생활형 MCP입니다. 주말, 공휴일, 대체공휴일을 계산해 언제 연차를 쓰면 며칠 쉴 수 있는지 알려줍니다.
```

```text
우리 아이 학교
나이스 교육정보를 기반으로 학교 급식, 학사일정, 시간표를 조회하는 생활형 MCP입니다. 학교명으로 학교코드를 찾고 오늘 급식, 시험 일정, 학년·반 시간표를 확인할 수 있습니다.
```

스타터 질문:

- 올해 남은 연차 3개로 최장 연휴 만들어줘
- 10월에 연차 3개 쓰면 최대 며칠 쉬어?
- 서울대치초등학교 오늘 급식 뭐야?
- 내일 3학년 2반 시간표 알려줘

비즈니스폼 소개문:

> 카톡에서 바로 쓰는 생활형 MCP 2종입니다. 연차 마법사는 최장 연휴를 계산하고, 우리 아이 학교는 나이스 기반 급식·일정·시간표를 조회합니다.
