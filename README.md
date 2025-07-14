# Remimazolam TCI TIVA V1.0.0: Effect-Site Concentration Prediction Application

## Overview

This Progressive Web Application implements a Target-Controlled Infusion (TCI) system for remimazolam in Total Intravenous Anesthesia (TIVA). The application provides real-time effect-site concentration predictions using validated pharmacokinetic models and advanced step-down protocols.

**Important Notice**: This application is designed for research and educational purposes only. It is not intended for clinical decision-making or patient care.

## Features

- **Real-time Effect-Site Concentration Prediction**: Advanced Variable-step Hybrid Algorithm (VHAC) for precise Ce calculations
- **Validated Pharmacokinetic Models**: Complete implementation of Masui et al. (2022) three-compartment model
- **ke₀ Calculation**: Full implementation of Masui & Hagihira (2022) regression model with 15 interaction terms
- **Step-Down Protocol Optimization**: Automated protocol adjustment with safety thresholds
- **Comprehensive Monitoring**: Six-point evaluation system for protocol performance
- **Progressive Web App**: Offline capability with responsive design

## Technical Implementation

### Pharmacokinetic Models

The application implements two validated models with 100% parameter accuracy:

1. **Primary PK Model**: Masui, K., et al. (2022). Population pharmacokinetics and pharmacodynamics of remimazolam in Japanese patients undergoing general anesthesia. *J Anesth* 36:493-505.

2. **ke₀ Model**: Masui, K., & Hagihira, S. (2022). Effect-site concentration of remimazolam calculated using population pharmacokinetic/pharmacodynamic analysis in Japanese patients undergoing general anesthesia. *J Anesth* 36:757-762.

### Computational Algorithms

- **Numerical Integration**: Fourth-order Runge-Kutta (RK4) with adaptive time stepping
- **Optimization Methods**: Binary search and grid search algorithms for TCI calculations
- **Effect-Site Modeling**: VHAC algorithm with three analytical scenarios for enhanced precision
- **Safety Protocols**: Conservative step-down logic with configurable thresholds

## System Requirements

This application is a Progressive Web App (PWA) requiring no special installation. It operates on modern web browsers including:

- Chrome (version 80+)
- Firefox (version 75+)
- Safari (version 13+)
- Edge (version 80+)

**Device Compatibility**: Desktop, tablet, and mobile devices with landscape orientation recommended for optimal display.

## Directory Structure

```
remimazolam_TCI_TIVA_V1_0_0/
├── index.html                          # Main application interface
├── manifest.json                       # PWA configuration
├── sw.js                              # Service worker for offline functionality
├── LICENSE                            # MIT license
├── README.md                          # This documentation
├── TECHNICAL_SPECS.md                 # Detailed technical specifications
├── confirm_claude.md                  # Mathematical verification report
├── css/
│   └── main.css                       # Application styling
├── js/
│   ├── main.js                        # Core application logic
│   ├── models.js                      # Pharmacokinetic model implementations
│   ├── protocol-engine.js             # TCI protocol calculations
│   ├── enhanced-protocol-engine.js    # Advanced protocol optimization
│   ├── advanced-protocol-engine.js    # High-precision protocol algorithms
│   ├── induction-engine.js            # Real-time induction calculations
│   └── monitoring-engine.js           # Dose monitoring and tracking
└── utils/
    ├── lsoda.js                       # LSODA numerical integration library
    ├── masui-ke0-calculator.js        # ke₀ calculation implementation
    └── vhac.js                        # Variable-step Hybrid Algorithm
```

## Usage Instructions

### For Clinical Researchers

1. **Patient Data Entry**: Input patient demographics (age, weight, height, sex, ASA-PS status)
2. **Target Setting**: Define target effect-site concentration (0.1-3.0 μg/mL)
3. **Protocol Selection**: Choose from standard or advanced step-down protocols
4. **Real-time Monitoring**: Monitor predicted concentrations during simulation
5. **Performance Analysis**: Review six-point evaluation metrics

### Protocol Modes

- **Induction Mode**: Real-time concentration prediction during anesthesia induction
- **Step-down Protocol**: Automated protocol optimization with safety thresholds
- **Monitoring Mode**: Input actual doses for concentration tracking and validation

### Safety Features

- **Parameter Validation**: Automatic bounds checking for all input parameters
- **Conservative Protocols**: Step-down thresholds prevent dangerous underdosing
- **Fallback Mechanisms**: Multiple calculation methods ensure computational robustness
- **Error Handling**: Comprehensive error management with user feedback

## Mathematical Validation

The application has undergone comprehensive mathematical verification confirming:

- **100% Parameter Accuracy**: All pharmacokinetic parameters exactly match published literature
- **Exact Model Implementation**: Complete reproduction of Masui regression equations
- **Numerical Precision**: Appropriate tolerance levels (1×10⁻¹² for ke₀ calculations)
- **Clinical Safety**: Conservative protocols with appropriate safeguards

Detailed mathematical verification is available in `confirm_claude.md`.

## Academic Use

This application accurately implements validated pharmacokinetic models suitable for:

- **Research Studies**: Population pharmacokinetic analysis and protocol optimization
- **Educational Training**: Anesthesia pharmacology and TCI principles
- **Method Development**: Advanced concentration prediction algorithms
- **Academic Publication**: Peer-reviewed research on remimazolam TCI protocols

**Manuscript Status**: Currently under review for academic publication.

## Disclaimer

**Important**: This application is intended for research and educational purposes only. It is not designed for clinical use or patient care decisions. All clinical decisions must be made by qualified medical professionals with appropriate training and institutional approval.

The developers assume no responsibility for any consequences arising from the use of this application in clinical or research settings.

## License

MIT License

Copyright (c) 2024 Yasuyuki Suzuki

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Author

**Yasuyuki Suzuki, MD, PhD**

Affiliations:
1. Department of Anaesthesiology, Saiseikai Matsuyama Hospital, Matsuyama City, Ehime, Japan
2. Department of Pharmacology, Ehime University Graduate School of Medicine, Toon City, Ehime, Japan  
3. Research Division, Saiseikai Research Institute of Health Care and Welfare, Tokyo, Japan

## Citation

If you use this application in your research, please cite:

```
Suzuki, Y. (2024). Remimazolam TCI TIVA V1.0.0: Effect-Site Concentration Prediction Application. 
GitHub. [URL to be provided upon publication]
```

## References

1. Masui, K., et al. (2022). Population pharmacokinetics and pharmacodynamics of remimazolam in Japanese patients undergoing general anesthesia. *Journal of Anesthesia*, 36(4), 493-505.

2. Masui, K., & Hagihira, S. (2022). Effect-site concentration of remimazolam calculated using population pharmacokinetic/pharmacodynamic analysis in Japanese patients undergoing general anesthesia. *Journal of Anesthesia*, 36(6), 757-762.

## Version History

- **V1.0.0**: Public release version with enhanced protocol optimization and VHAC algorithm implementation (previously V4.3)
- **V0.9.2**: Advanced step-down protocols with comprehensive safety features  
- **V0.9.1**: Integration of Masui & Hagihira ke₀ regression model
- **V0.9.0**: Complete implementation of Masui 2022 pharmacokinetic model

---

*Last updated: July 2024*