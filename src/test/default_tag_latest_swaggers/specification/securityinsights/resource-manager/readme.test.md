
### Tag: package-composite-v1

These settings apply only when `--tag=package-composite-v1` is specified on the command line.

```yaml $(tag) == 'package-composite-v1'
test-resources:
  - test: Microsoft.SecurityInsights/stable/2020-01-01/test-scenarios/alertRules.yaml
  - test: Microsoft.SecurityInsights/stable/2020-01-01/test-scenarios/bookmarks.yaml
  - test: Microsoft.SecurityInsights/stable/2020-01-01/test-scenarios/dataConnectors.yaml
  - test: Microsoft.SecurityInsights/stable/2020-01-01/test-scenarios/incidents.yaml
```
