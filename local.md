```
aws dynamodb list-tables --region us-east-1
```

```
aws dynamodb scan \
  --table-name FlightSubscriptions \
  --region us-east-1

```

```
aws dynamodb scan \
  --table-name FlightEvents \
  --region us-east-1
```