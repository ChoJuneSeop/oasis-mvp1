# Gamma v2.1 킬서치 — 2026-09-09

실험 전 필요성 반증 검토. 개별 v2/v2.1 결과를 열지 않고 코드와 방법론을 검토했다.

기준 commit: `1ec3c3684d7004820bf998440039de84e53138e3`.
기존 v2 파일/결과는 수정하지 않는다. 새 branch: `experiment/oasis-gamma-v2.1-confirmatory`.

## 실험이 불필요하거나 해석 불가능할 가능성

1. 기존 실험이 이미 브리지만 분리했는가? 아니다. v2 OffKernel.gamma는 활성화 후 []를 반환한다. canonical relevantRelations는 activeRelations에서 R_c를 구성한다. 따라서 기존 비교는 과거 과정 브리지 제거와 canonical 관계 제거를 혼합한다. 기존 결과의 부호/크기와 무관하게 분리 실험 필요성이 있다.
2. 브리지가 canonical 후보와 항상 중복인가? 기존 생성기는 sigma 중복을 제외한다. 실제 흐름에서 새 후보가 생길지는 미확인이다. 도달하지 못한 seed는 분모 40에 남기고, seed/grammar/예산을 조정하지 않는다.
3. 후보 수 효과일 뿐인가? G3의 현재 물리적으로 가능한 비역사 후보로 수와 깊이를 맞춰 경쟁 설명을 검토한다. 불가능하면 fail-closed(조건 불충족 시 중단)하며 부적합 대조군을 증거로 사용하지 않는다.
4. 순서 정보가 필요 없는가? G2에서 sourceSigmaActions 순서만 결정론적으로 섞고 multiset(중복 개수를 포함한 원소 집합)을 보존한다. 동일한 행동 반복은 정보상 섞이지 않을 수 있으므로 변화량을 기록한다.
5. choice-input equality를 정규화 확률까지 해석하면 가능한가? 기존 distribution은 exp(Psi)/sum(exp(Psi)). 후보가 추가/제거되면 공통 후보의 정규화 확률도 변한다. 이는 같은 선택 함수의 하류 효과이며, 원래 Psi/공통 입력 변경과 구별해야 한다. 이 해석은 설계잠금에 명시하며 질문을 사용자에게 제시했다.
6. 비음수 거리값에 부호반전 검정을 적용하면 타당한가? 영가설에서 부호 교환가능성이 없으므로 v2의 일반 signFlipP를 비음수 거리의 유의성 근거로 재사용하지 않는다. 거리/발생률/구간을 기술하고, 부호 있는 재사용 차이와 사전 지정 대조군 차이에만 교환가능성 가정을 명시한다.

## 외부 검색 기록과 제한

검색어: `OASIS historical process bridge`, `ChoJuneSeop/oasis-mvp1 Gamma`, `preregistration revolution`, `simulation common random numbers`, `causal models interventions mechanism modularity`, `ablation causal scrubbing`.
첫 두 검색어에서 이 저장소의 질문을 해결한 독립 검증을 확인하지 못했다. 검색 부재는 신규성의 증명이 아니다.

- Nosek et al., The preregistration revolution (사전등록 혁명), 2018: https://doi.org/10.1073/pnas.1708274114 — 예측/분석과 결과 후 탐색을 분리하는 근거. OASIS의 타당성을 입증하지 않는다.
- Simulation Experiments as a Causal Problem (인과 문제로서의 시뮬레이션 실험), 2023: https://arxiv.org/abs/2308.10823 — 시뮬레이션 메커니즘 개입의 설계 관점. 이 실험은 고정 구현 내 인과성에 한정한다.
- Causal Abstraction for Mechanistic Interpretability (메커니즘 해석을 위한 인과 추상화): https://www.jmlr.org/beta/papers/v26/23-0058.html — 메커니즘 변환과 추상화의 구별. 브리지 제거 외 입력 변화는 분리 타당성을 훼손한다는 본 실험의 적용 판단.
- On the Effectiveness of Common Random Numbers (공통 난수의 효과), 1979: https://pubsonline.informs.org/doi/pdf/10.1287/mnsc.25.7.649 — 같은 난수 입력을 사용한 비교 원칙. seed 동일성만으로 숨은 RNG 상태 동일성을 단정하지 않는다.
- Redwood Research, Causal Scrubbing (인과 가설에 따른 정보 제거), 2022: https://www.alignmentforum.org/posts/JvZhhzycHu2Yd57RN/causal-scrubbing-a-method-for-rigorously-testing — 가설을 명확히 한 대조 개입. 신경망 연구이므로 OASIS 직접 증거로 간주하지 않는다.

결론: 결함 분리에 한정한 v2.1은 필요하다. 우월성, 인간 사회 일반화, 문명 속도 향상을 검증하지 않는다. 현재 흐름에서 최초 적격 시점을 찾고 이후 전체 외부 궤적을 비교한다. 결과에 따른 조건 재설계는 v2.1 밖에서만 가능하다.
