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

### Admin Key Management

**Admin Address Setup:**

The program uses a single admin address that can deploy upgrades.

**Before deployment:**

```bash
# Use an existing secure account or generate new one
aleo account new
```

**Update constructor in `src/main.leo`:**

```leo
@admin(address="aleo1your_actual_admin_address_here")
async constructor() {}
```

**Key Storage:**
- Store admin private key securely (hardware wallet recommended)
- Create encrypted backups
- Document recovery procedures
- Consider upgrading to multi-sig governance later

**Upgrade Execution Process:**

1. Develop upgrade on testnet
2. Test thoroughly (integration tests, manual testing)
3. Optional: External security audit for critical changes
4. Deploy upgrade from admin account
5. New code is live immediately

**Future Governance Upgrades:**

Can add complexity later via program upgrade:
- Multi-signature (2-of-3 or 3-of-5)
- Timelock delays
- Community voting
- Ossification (permanent immutability)