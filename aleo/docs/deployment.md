## Leo Deployment Specifications

### Environment Configuration

**Development:**

```bash
ENDPOINT=https://api.explorer.aleo.org/v1
NETWORK=testnet
PRIVATE_KEY=APrivateKey...
```

**Production:**

```bash
ENDPOINT=https://api.explorer.aleo.org/v1
NETWORK=mainnet
PRIVATE_KEY=APrivateKey...
```

### Program Deployment

```bash
# Step 1: Compile Leo program
cd aleo
leo build

# Step 2: Generate deployment keys
leo deploy

# Step 3: Broadcast deployment transaction
# Cost: ~1.9 ALEO
# Time: ~5-10 minutes for key synthesis
```

**Deployment Checklist:**

- [ ] Program compiles without warnings
- [ ] All unit tests pass
- [ ] Testnet deployment successful
- [ ] Integration tests pass on testnet
- [ ] Security audit completed
- [ ] Gas cost estimation verified
- [ ] Mainnet deployment keys funded
- [ ] Deployment transaction confirmed
- [ ] Program ID published in documentation