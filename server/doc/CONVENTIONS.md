# Naming Conventions

## Ratios
- `ratio_A_to_B`: Always A / B (dimensionless)
- Example: `ratio_other_to_operating = other_income / operating_income`

## Percentages
- `*_margin`: Percentage (0-100), e.g., `gross_margin`, `fcf_margin`
- `*_pct`: Percentage (0-100), e.g., `gap_pct`
- `*_growth`: Growth rate as decimal, e.g., `revenue_growth_yoy`

## Warnings
- Warning keys match `warning_context` keys 1:1
- Example:
  ```json
  {
    "warnings": ["net_income_gt_operating_income_due_to_other_income"],
    "warning_context": {
      "net_income_gt_operating_income_due_to_other_income": {
        "other_income": 9541000000,
        "ratio_other_to_operating": 0.249
      }
    }
  }
