# Data Conventions

## Financial Statement Rules

### Cash Flow Statement
- **CAPEX**: Always stored as **negative** (cash outflow)
  - Example: `-38398000000` represents $38.4B spent on PP&E
- **Free Cash Flow**: `FCF = OCF + CAPEX`
  - Since CAPEX is negative, this is effectively `OCF - abs(CAPEX)`

### Balance Sheet
- **Debt**: Defined as `short_term_debt + long_term_debt`
  - **EXCLUDES**: Accounts payable, accrued liabilities, deferred revenue
  - **INCLUDES**: Only interest-bearing debt obligations
- **Debt-to-Equity**: `(short_term_debt + long_term_debt) / total_equity`

### Income Statement
- **Operating Expenses**: R&D + S&M + G&A (excludes COGS)
- **Total Costs and Expenses**: COGS + Operating Expenses

## Warning Thresholds

### `net_income_boosted_by_nonoperating_income`
- **Trigger**: `net_income > operating_income * 1.01` AND `other_income / operating_income >= 0.10`
- **Meaning**: Net income significantly exceeds operating income due to non-operating activities (interest, investments, equity income)
- **Example**: GOOGL Q3 FY2025 - $12.8B other income on $31.2B operating income (40.9% ratio)

### `net_income_gt_operating_income_small_gap`
- **Trigger**: `net_income > operating_income * 1.01` AND `other_income / operating_income < 0.10`
- **Meaning**: Small gap, likely due to tax benefit or missing data

### `pretax_vs_operating_gap_unexplained`
- **Trigger**: `abs(income_before_tax - operating_income - other_income - interest_net) > operating_income * 0.05`
- **Meaning**: Gap between pretax and operating income not explained by mapped non-operating items
- **Action**: Check for unmapped interest income, equity method investments, or forex gains/losses

## Naming Conventions

### Ratios
- `ratio_A_to_B`: Always `A / B` (dimensionless)
- Example: `ratio_other_to_operating = other_income / operating_income`

### Margins
- `*_margin`: Percentage (0-100)
- Example: `gross_margin = (gross_profit / revenue) * 100`

### Growth
- `*_growth`: Percentage change (can be negative)
- Example: `revenue_growth_yoy = ((current - prior) / abs(prior)) * 100`
