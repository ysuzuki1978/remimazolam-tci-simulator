# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-01-16

### Added
- **🆕 ±Button Controls**: Enhanced mobile-optimized numerical input interface
  - Replaced all range sliders with precise ±button controls
  - Progressive acceleration algorithm for long-press functionality (500ms delay)
  - Visual feedback with pulse animation during long-press operations
  - Unified event delegation system for scalable event handling
- **iOS Safari Optimization**: Enhanced modal interaction compatibility
  - Proper touchend event handling to prevent iOS Safari conflicts
  - Improved modal backdrop interaction on touch devices
- **Mobile Touch Optimization**: Accessibility-compliant touch targets
  - 44px touch targets for desktop/tablet devices
  - 50px touch targets for mobile devices (phones)
  - Enhanced responsive design for various screen sizes

### Changed
- **Input Interface Migration**: Complete transition from range sliders to ±button controls
  - Patient Information Modal: Age, Weight, Height controls with ±buttons
  - Induction Panel: Bolus dose and continuous infusion controls
  - Dose Event Modal: Administration dose controls
- **Event Handling Architecture**: Unified event delegation system
  - Single event listener delegation for all ±button controls
  - Improved performance through reduced event listener overhead
  - Scalable architecture for future input control additions

### Fixed
- **iOS Safari Modal Issues**: Resolved touch event conflicts in modal interactions
- **Progressive Acceleration**: Long-press functionality with proper timing
  - 500ms delay before activation
  - Accelerating intervals (200ms → 50ms with 0.9 multiplier)
  - Smooth transition between single-click and long-press modes
- **Touch Event Handling**: Prevented default behaviors to avoid unintended interactions

### Technical Improvements
- **setupAdjustButtonControls()**: Comprehensive ±button control management
- **Progressive Acceleration Algorithm**: Mathematical precision in timing control
- **CSS Optimization**: Mobile-first responsive design with proper touch targets
- **Event Delegation**: Unified system for handling all ±button interactions

## [1.1.0] - 2025-01-16

### Added
- **🆕 Digital Picker Components**: Mobile-optimized numerical input interface
  - Enhanced +/- buttons with visual feedback and disabled states
  - Long-press support for rapid value adjustment (0.5s delay, 0.1s intervals)
  - Direct keyboard input with natural typing experience
  - Touch-friendly design with 44px+ touch targets for mobile devices
- **Improved Input Validation**: Range validation occurs on focus loss, allowing natural number entry
- **Enhanced CSS Styling**: Complete digital picker styling with accessibility features
  - High contrast mode support for better visibility
  - Reduced motion support for users with motion sensitivity
  - Mobile-responsive design adjustments

### Changed
- **Patient Information Modal**: Replaced slider inputs with digital picker components
  - Age picker: 18-100 years (integer values)
  - Weight picker: 30-200 kg (1 decimal place)
  - Height picker: 120-220 cm (integer values)
- **Induction Panel Controls**: Updated dose input interfaces
  - Bolus dose picker: 1-15 mg (1 decimal place)
  - Continuous infusion picker: 0-12 mg/kg/hr (2 decimal places)
- **Dose Event Modal**: Enhanced dose input controls
  - Administration bolus: 0-20 mg (1 decimal place)
  - Administration continuous: 0-12 mg/kg/hr (2 decimal places)

### Fixed
- **Keyboard Input Issues**: Resolved problem where typing numbers immediately triggered range limits
- **Event Listener Safety**: Added null safety checks to prevent errors with missing DOM elements
- **Touch Event Handling**: Improved mobile touch responsiveness and prevented default behaviors

### Technical Improvements
- **DigitalPicker Class**: 211-line comprehensive input component with floating-point arithmetic correction
- **Error Handling**: Enhanced try-catch blocks and safety checks throughout the application
- **Mobile Optimization**: Improved touch targets and responsive design for smartphone usage

## [1.0.0] - 2025-07-13

### Added
- **レミマゾラムTCI計算エンジン**: 効果部位濃度目標制御輸注システム
- **Advanced Step-down Protocol**: 段階的減量プロトコル最適化機能
- **リアルタイム誘導計算**: 麻酔導入時の濃度予測機能
- **投与量モニタリング**: 実際の投与量入力と濃度監視機能
- **PWA対応**: オフライン機能とモバイル最適化
- **高精度計算エンジン**: LSODA数値解法による薬物動態計算
- **Masui Ke0計算機**: 効果部位濃度計算ユーティリティ
- **VHAC統合**: Variable Height Ascending Cumulative機能

### Technical Features
- JavaScript ES6+ による非同期処理対応
- Service Worker によるオフライン機能
- Responsive Design for multiple devices
- Progressive Web App (PWA) 対応

### Medical Features  
- レミマゾラム薬物動態モデル実装
- 効果部位濃度ターゲット制御
- 患者特性に基づく個別化投与
- 安全性アラート機能

### Documentation
- 包括的なREADME.md
- 技術仕様書 (TECHNICAL_SPECS.md)
- ライセンス情報 (MIT License)

## [Unreleased]

### Planned
- 多言語対応 (English/Japanese)
- PDF出力機能
- 計算履歴保存機能
- グラフ表示機能の強化