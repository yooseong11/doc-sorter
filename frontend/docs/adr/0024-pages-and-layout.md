# 0024. 화면은 pages/, 공통 레이아웃은 layouts/에 둔다

## 결정
라우터에 직접 연결되는 화면을 `src/pages/*Page.jsx`로 두고, Header와 Outlet을 담는 공통 틀을 `src/layouts/MainLayout.jsx`에 둔다. `src/components/`에는 페이지 안에서 재사용하는 조각만 남긴다.

## 이유
App이 라우트·상태·공통 크롬·화면을 모두 들고 있어 책임이 섞였다. Layout → Outlet → Page 구조를 따르면 새 화면의 위치가 분명해지고, Header를 화면마다 반복하지 않는다.

## 버린 대안
- `components/`에 화면과 조각을 함께 두기: 라우터에 붙는 화면과 재사용 조각이 이름으로 구분되지 않는다.
- Sidebar를 넣은 레이아웃: 3단계 흐름에는 단계 이동만으로 충분하고 화면 폭을 잡아먹는다.
- 화면마다 Header를 직접 작성: 공통 크롬이 화면 수만큼 늘어난다.
- Page 래퍼만 두고 기존 Screen을 유지: 파일이 두 겹이 되어 이름만 늘어난다.
