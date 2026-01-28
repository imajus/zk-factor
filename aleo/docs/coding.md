# Leo Language Guide

This guide provides Leo-specific conventions and constraints for development.

## Style Conventions

**Naming:**
- Packages: snake_case (prefer single word)
- Structs/Records: CamelCase
- Functions/transitions: snake_case
- Variables/parameters/members: snake_case

**Formatting:**
- Indentation: 4 spaces per level
- Opening braces: same line
- Semicolons: required on all statements including `return`
- Trailing commas: include when closing delimiters on separate lines
- Blank lines: single blank line between top-level declarations

**File Organization Order:**
1. Imports (outside program scope)
2. Program declaration (`program {name}.aleo { }`)
3. Mappings
4. Records + Structs
5. Functions + Transitions

## Best Practices

**Conditional Logic:**
Prefer ternary expressions over if-else in transitions:
```leo
// Preferred (cheaper for circuit construction)
return condition ? value_a : value_b;

// Avoid in transitions
if condition {
    return value_a;
} else {
    return value_b;
}
```
Both values resolve before condition evaluation, avoiding duplicated computations in branching logic.

**Async Code:**
Prefer inline `async` blocks over separately declared `async function`:
```leo
// Preferred
transition my_transition() -> Future {
    return finalize_my_transition();
}

async function finalize_my_transition() {
    // async logic here
}

// This is better for conciseness
```

**Module Organization:**
- `constants.leo` - All constant declarations
- `structs.leo` - Struct and record definitions
- `utils.leo` - Inline helper functions
- `main.leo` - Public interface only (externally callable transitions)

Keep `main.leo` focused on the program interface. Modules flatten during compilation.

## Program ID Rules

Valid format: `{name}.aleo`

**Name requirements:**
- Begin with lowercase letter
- Only lowercase letters, numbers, underscores
- No double underscores
- Cannot contain the word "aleo"

**Invalid examples:**
- `Foo.aleo` (uppercase)
- `0foo.aleo` (starts with number)
- `foo__bar.aleo` (double underscore)

## Record Model

**Records are private, UTXO-like:**
- Encrypted with owner's view key
- Consumed when spent (serial number published)
- Cannot be read without consuming
- Owner must scan blockchain to discover

**Implications:**
- No read-only record access
- Every verification costs gas (consume + recreate)
- Serial numbers prevent double-spend
- Async record availability in wallets

## Mappings vs Records

**Use mappings for:**
- Public state (visible to all)
- Global counters/registries
- Reference data

**Use records for:**
- Private data
- Transferable assets
- UTXO-style ownership

## Transition vs Function

**Transition:**
- Creates on-chain transaction
- Can accept records as input/output
- Costs gas
- Publicly visible (function name, not params if private)
- Can call async finalize logic

**Function:**
- Off-chain computation only
- Cannot access mappings
- No gas cost
- Used for helper logic

**Inline function:**
- Inlined at compile time
- Can be called from transitions or functions
- No separate circuit

## Async Operations

**Async transitions:**
```leo
transition my_transition() -> Future {
    return finalize_my_transition();
}

async function finalize_my_transition() {
    // Can read/write mappings here
    // Executes after transition
}
```

**Async blocks access mappings:**
Only async finalize functions can read/write public mappings.

## Type System

**Integers:**
- Unsigned: u8, u16, u32, u64, u128
- Signed: i8, i16, i32, i64, i128
- Field elements: field (modular arithmetic)

**Address:**
- Aleo addresses (aleo1...)
- Use for ownership/identity

**Boolean:**
- true/false
- Used in assertions and conditionals

**Composite:**
- struct: named collection of fields
- record: private struct with owner field

## Common Patterns

**Ownership transfer:**
```leo
record MyRecord {
    owner: address,
    data: u64
}

transition transfer(rec: MyRecord, recipient: address) -> MyRecord {
    return MyRecord {
        owner: recipient,
        data: rec.data
    };
}
```

**Atomic swaps:**
```leo
transition swap(record_a: RecordA, record_b: RecordB) -> (RecordB, RecordA) {
    return (record_b, record_a);
}
```

**Mapping updates:**
```leo
mapping balances: address => u64;

transition update_balance(amount: u64) -> Future {
    return finalize_update(self.caller, amount);
}

async function finalize_update(addr: address, amount: u64) {
    let current: u64 = Mapping::get_or_use(balances, addr, 0u64);
    Mapping::set(balances, addr, current + amount);
}
```

## Aleo Platform Constraints

**Proving times:**
- First synthesis: 5-7 minutes
- Subsequent proofs: 30-60 seconds
- Not suitable for real-time UX

**Transaction limits:**
- Max size: 128 KB
- Circuit constraints: ~2M per transition
- Max records per program: 310

**Missing features:**
- No SHA-256 (use Poseidon hash)
- No RSA/ECDSA (EdDSA only)
- No floating point (use fixed-point with u64/u128)
- Function names are public (not private)

**Workarounds:**
- Off-chain verification → on-chain attestation
- Fixed-point arithmetic for decimals
- ZK proofs for range/membership checks

## Testing

**Test structure:**
```leo
import my_program.aleo;

program test_my_program.aleo {
    @test
    script test_case_name() {
        let result: u32 = my_program.aleo/my_transition(1u32, 2u32);
        assert_eq(result, 3u32);
    }

    @test
    @should_fail
    transition test_failure() {
        // Test expected failures
    }

    @noupgrade
    async constructor() {}
}
```

**Test annotations:**
- `@test` - Mark as test case
- `@should_fail` - Expect failure
- Use `assert_eq`, `assert_neq` for validation

## Common Errors

**"Record not found":**
- Wallet hasn't synced yet
- Record was already consumed
- Wrong network/address

**"Serial number already exists":**
- Double-spend attempt (expected behavior)
- Record was consumed in previous transaction

**"Mapping not found":**
- Trying to access mapping from non-async context
- Mapping not initialized

**Circuit constraints exceeded:**
- Transition too complex
- Break into multiple transitions
- Reduce computation depth
