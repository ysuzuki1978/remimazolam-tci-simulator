# Remimazolam TCI TIVA V2.2 - Target Controlled Infusion Simulator

## Overview

A Progressive Web Application for Target-Controlled Infusion (TCI) simulation of remimazolam in Total Intravenous Anesthesia (TIVA). The app provides a seamless 3-step workflow: Induction prediction, Protocol optimization, and Dose monitoring — optimized for iPhone with an OR-monitor dark theme.

**Important Notice**: This application is designed exclusively for research and educational purposes. It is not intended for clinical decision-making, patient care, or therapeutic applications.

## Live Application

**https://ysuzuki1978.github.io/remimazolam-tci-simulator/**

## User Manual / 取扱説明書

- [User Manual (English)](docs/manual_en.html)
- [取扱説明書 (日本語)](docs/manual_ja.html)

## Features

- **3-Step Seamless Workflow**: Induction → Protocol → Monitoring with automatic data transfer
- **Real-time Induction Prediction**: Live plasma/effect-site concentration tracking with LOC Ce recording
- **Step-down Protocol Optimization**: Safety margin calculation and adaptive dosing schedule
- **Dose Monitoring**: Actual dose input with concentration simulation and CSV export
- **Validated PK Model**: Masui et al. (2022) J Anesth three-compartment model
- **ke0 Calculation**: Masui & Hagihira (2022) regression model with 15 interaction terms
- **iPhone-optimized PWA**: Offline capability, dark OR-monitor theme, safe-area support

## Version History

### V2.2 (2026-03-23)
- **PWA Update Notification**: Non-intrusive banner notifies users when a new version is available; update applies on next launch without interrupting active sessions
- **Service Worker Cache Sync**: Aligned SW version with app version; updated cache file list to match all loaded scripts

### V2.1 (2026-03-21)
- **Bug Fix**: Corrected effect-site concentration (Ce) calculation in Induction Engine
  - `getEffectSiteConcentration()` was using an incorrect simplified approximation instead of the RK4-integrated value
  - The broken formula `Ce = Cp * (1-exp(-ke0*t)) * exp(-k10*t*0.5)` caused Ce to diverge from Cp unrealistically
  - Fixed to use `this.rk4State.ce` computed by the coupled 4-compartment RK4 ODE solver via `dCe/dt = ke0 * (Cp - Ce)`
  - Before fix: Cp/Ce ratio ~3.1x at 3 min; After fix: ~1.3x, converging as expected
- OR-monitor dark theme for clinical environment
- iPhone-optimized UI with safe-area support

### V2.0
- Seamless 3-step workflow (Induction → Protocol → Monitoring)
- Automatic data transfer between steps

## System Requirements

Modern browsers (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+). Works on desktop, tablet, and mobile devices.

## Validation — Cross-reference with Excel_PkPd Ver1.46 Lite

The PK engine of this application has been cross-validated against [Excel_PkPd Ver1.46 Lite](https://home.hiroshima-u.ac.jp/r-nacamura/Excel_PkPd/Excel_PkPd146_Lite.xls), a widely adopted PK/PD simulation tool in the Japanese anesthesiology community developed by Prof. Ryuji Nakamura (Hiroshima University). Both systems implement the same Masui (2022) population PK model with RK4 numerical integration.

### Validation Results

| Item | Result |
|------|--------|
| **PK parameters** (V1, V2, V3, k10, k12, k13, k21, k31) | Identical (diff < 10⁻¹⁵) |
| **ke0** | 0.51% difference (numerical solver implementation) |
| **Cp/Ce over 180 min** (12 mg bolus + 1.0 mg/kg/hr) | Max deviation: Cp 0.57%, Ce 0.52% |
| **Cp/Ce at t ≥ 15 min** | < 0.001% (virtually identical) |

The small deviation observed in the first few minutes is attributable to the difference in RK4 timestep size (app: dt = 0.01 min vs. Excel: dt = 1 min), not to any difference in model implementation. When computed with an identical timestep, the deviation is exactly zero.

For full details, see the [Validation Report (PDF)](Remimazolam_TCI_Validation_Report.pdf).

## Pharmacokinetic Models

1. **Primary PK Model**: Masui, K., et al. (2022). Population pharmacokinetics and pharmacodynamics of remimazolam in Japanese patients undergoing general anesthesia. *J Anesth* 36:493-505.

2. **ke0 Model**: Masui, K., & Hagihira, S. (2022). Effect-site concentration of remimazolam calculated using population pharmacokinetic/pharmacodynamic analysis in Japanese patients undergoing general anesthesia. *J Anesth* 36:757-762.

## Disclaimer

**Research Use Only**: This application is designed exclusively for research and educational purposes. It is not validated for clinical use, patient care decisions, or therapeutic applications. The developers explicitly disclaim all responsibility for any consequences arising from the use of this software in clinical settings.

## License

MIT License - Copyright (c) 2025 Yasuyuki Suzuki

## Author

**Yasuyuki Suzuki, MD, PhD**

1. Department of Anaesthesiology, Saiseikai Matsuyama Hospital, Matsuyama City, Ehime, Japan
2. Department of Pharmacology, Ehime University Graduate School of Medicine, Toon City, Ehime, Japan

## References

1. Masui, K., et al. (2022). Population pharmacokinetics and pharmacodynamics of remimazolam in Japanese patients undergoing general anesthesia. *Journal of Anesthesia*, 36(4), 493-505.
2. Masui, K., & Hagihira, S. (2022). Effect-site concentration of remimazolam calculated using population pharmacokinetic/pharmacodynamic analysis in Japanese patients undergoing general anesthesia. *Journal of Anesthesia*, 36(6), 757-762.
