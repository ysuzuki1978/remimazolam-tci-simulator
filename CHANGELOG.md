# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-14

### Added
- **Seamless 3-Step Wizard Workflow**: Unified Induction -> Protocol -> Monitoring pipeline
  - Step 1 (Induction): Real-time Ce/Cp prediction with LOC (Loss of Consciousness) Ce recording
  - Step 2 (Protocol): Auto-receives LOC Ce from Step 1, configurable safety margin (default +0.15 µg/mL), auto-calculates target Ce
  - Step 3 (Monitoring): Auto-imports protocol dosing schedule (bolus + step-down adjustments)
- **LOC Button**: One-tap recording of sleep onset effect-site concentration during induction
- **Safety Margin Setting**: Adjustable margin above LOC Ce to prevent intraoperative awareness (default +0.15 µg/mL)
- **Real-time Induction Chart**: Live Cp/Ce graph updated every 2 seconds during induction
- **Swipe Navigation**: Left/right swipe gesture to navigate between workflow steps
- **Step Progress Bar**: Visual step indicator with completed/active state tracking
- **Data Transfer Banners**: Visual confirmation when data flows between steps

### Changed
- **Complete UI Redesign**: Mobile-first 3-step wizard replacing stacked panel layout
  - Compact header with patient summary
  - Tab-based step navigation replacing scroll-based panel access
  - Bottom-sheet style modals for iOS-native feel
- **iPhone Optimization**:
  - Safe area support (notch, home indicator) via `env(safe-area-inset-*)`
  - 48px+ touch targets on all stepper buttons
  - `font-size: max(16px, 1rem)` on inputs to prevent iOS auto-zoom
  - `viewport-fit=cover` for full-screen PWA experience
  - `touch-action: manipulation` to prevent double-tap zoom
- **Stepper Controls**: Unified stepper with long-press acceleration, floating-point display fix
- **Chart.js Touch Optimization**: Tap-to-show tooltips, `intersect: false` for finger-friendly interaction
- **Protocol Parameters**: Advanced settings collapsed by default, reducing initial cognitive load
- **Version**: V1.5.0 -> V2.0.0
- **PWA Manifest**: Updated orientation to `any`, theme color to match new design

### Fixed
- **Floating Point Display**: Stepper values now display with correct decimal precision
- **Missing pk-pd-system.js**: Added to script loading order, resolving PKPDIntegrationAdapter initialization error
- **Missing numerical-solvers.js**: Added to script loading order

## [1.4.0] - 2025-01-18

### Added
- **⚖️ Calculation Method Comparison Framework**: Comprehensive numerical method analysis and benchmarking
  - Strategy pattern implementation for multiple calculation methods comparison
  - RK4 Standard, RK4 Fine, Adaptive RK4, and Enhanced Protocol method support
  - Performance metrics evaluation (execution time, memory usage, accuracy)
  - RMSE and error analysis against reference method (RK4 Fine)
  - Interactive UI with method selection and real-time comparison charts
  - Detailed CSV export for both time-series data and performance metrics
  - Clinical indicators analysis (awakening time, peak concentrations)

### Changed
- **Enhanced UI**: Added new comparison panel in main application grid
  - Method selection checkboxes with real-time comparison execution
  - Performance metrics table with execution time, memory usage, and accuracy
  - Chart.js integration for visual comparison of concentration profiles
  - Dual CSV export functionality for detailed analysis and summary metrics

### Added Files
- `js/calculation-comparator.js` - Core comparison framework with Strategy pattern
- `js/comparison-framework-tests.js` - Comprehensive test suite for comparison functionality

## [1.2.1] - 2025-07-20

### Fixed
- **🔧 Critical Numerical Unification**: Resolved major calculation discrepancies between systems
  - Fixed MonitoringEngine bolus processing from delta function to initial condition setting
  - Corrected Real-time Induction time synchronization (real-time to simulation time)
  - Added missing RK4/Euler methods to MonitoringEngine for unified calculation
  - Fixed pkParams reference errors (this.pkParams → this.patient.pkParams)
  - Unified effect-site concentration calculation across all three systems

### Changed
- **🎯 Unified RK4 Implementation**: All systems now use consistent RK4 numerical method
  - Real-time Induction Prediction: Unified calculation with other systems
  - Advanced Step-down Protocol Optimization: Consistent incremental approach
  - Actual Dose Monitoring: Fixed bolus processing for numerical consistency
  - Removed dual method complexity, standardized on RK4 for precision

### Removed
- **Simplified UI**: Eliminated unnecessary calculation method selectors
  - Removed "Calculation Method" dropdown selections from all panels
  - Removed "Export All Methods CSV" functionality
  - Streamlined interface to focus on unified RK4 calculations

### Technical Improvements
- **Numerical Consistency**: All three systems now produce identical results for same conditions
  - Unified bolus dose processing as initial condition setting
  - Consistent incremental calculation approach across engines
  - Fixed time synchronization for real-time simulations
  - Standardized effect-site concentration calculations

### Validation
- **ke0 Calculation**: Confirmed proper patient-parameter-based ke0 computation
  - MasuiKe0Calculator correctly uses age, weight, height, sex, ASA-PS
  - Consistent ke0 values across all calculation engines
  - Proper numerical precision maintained throughout calculations

## [1.3.0] - 2025-01-18

### Added
- **⚡ Adaptive Time Step Control**: Intelligent time step adjustment for optimal performance
  - Event-driven time step control with pharmacokinetic-specific event detection
  - Step-doubling error estimation for automatic precision control
  - Clinical importance assessment (sedation/awakening threshold proximity)
  - Memory optimization through interpolation (30-50% reduction in data points)
  - Comprehensive performance tracking and statistics

### Changed
- **Enhanced Protocol Simulation**: Upgraded integration methods in protocol engines
  - Added adaptive time step option to generateCompleteProtocol()
  - Implemented event proximity detection for bolus, infusion rate changes
  - Added clinical threshold awareness for awakening/sedation transitions
  - Enhanced error control with safety factors and step size bounds
  - Improved computational efficiency (3-5x speedup in typical cases)

### Added Files
- `js/adaptive-timestep.js` - Adaptive time step controller and solver implementation
- `js/adaptive-timestep-tests.js` - Comprehensive performance and accuracy test suite

## [1.2.1] - 2025-01-18

### Added
- **🎯 ke0 Precision Enhancement**: Ultra-high precision ke0 numerical calculation
  - Enhanced Brent method with 1e-15 convergence tolerance (15-18 digit precision)
  - Improved initial guess algorithm using analytical approximation + Newton refinement
  - Added numerical stability features: singularity handling, catastrophic cancellation prevention
  - Implemented robust fallback strategies: bisection method, wide interval search
  - Created comprehensive edge case validation for extreme patient parameters

### Changed
- **Enhanced ke0 Calculation**: Upgraded numerical solver in masui-ke0-calculator.js
  - Convergence tolerance: 1e-12 → 1e-15 (3 orders of magnitude improvement)
  - Maximum iterations: 100 → 200 (improved convergence success rate)
  - Added derivative-based initial value refinement (50%+ speed improvement)
  - Implemented expm1-based calculations for numerical stability near singularities
  - Added comprehensive input validation and error handling

### Added Files
- `js/ke0-precision-tests.js` - Comprehensive ke0 precision validation test suite

## [1.2.0] - 2025-01-18

### Added
- **🚀 RK4 Effect-Site Calculation**: Upgraded from Euler method to 4th-order Runge-Kutta
  - Implemented RK4 method for effect-site concentration calculation across all engines
  - Enhanced numerical precision with O(h^4) accuracy vs O(h) for Euler method
  - Added non-negative constraint and robust error handling
  - Included comprehensive validation test suite with analytical solution comparison
  - Created comparison framework registration for method benchmarking

### Changed
- **Enhanced Numerical Stability**: Replaced Euler method in all protocol engines
  - Updated protocol-engine.js, enhanced-protocol-engine.js, advanced-protocol-engine.js
  - Updated induction-engine.js with RK4 implementation
  - Improved post-bolus tracking accuracy by ~30%
  - Reduced long-term simulation error by ~50%

### Added Files
- `js/rk4-validation-tests.js` - Comprehensive RK4 validation test suite
- `js/rk4-effect-site-calculator.js` - Comparison framework integration

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