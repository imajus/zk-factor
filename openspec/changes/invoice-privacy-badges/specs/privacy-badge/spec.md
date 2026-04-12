## ADDED Requirements

### Requirement: PrivacyBadge displays audience level for a data field
The system SHALL provide a `PrivacyBadge` component that accepts a `level` prop (`PrivacyLevel | PrivacyLevel[]`) and renders a colored icon chip with a tooltip explaining who can see the data.

#### Scenario: Single level renders one chip
- **WHEN** `<PrivacyBadge level="private" />` is rendered
- **THEN** one chip with a Lock icon and amber color is displayed

#### Scenario: Multiple levels render side-by-side chips
- **WHEN** `<PrivacyBadge level={['factor', 'debtor']} />` is rendered
- **THEN** two chips are displayed — a Briefcase (violet) and a UserCheck (sky) — in a flex row

#### Scenario: Tooltip appears on hover
- **WHEN** a user hovers over a badge chip
- **THEN** a tooltip appears with a prose explanation of who can see this data

#### Scenario: Screen reader text is present
- **WHEN** a badge chip is rendered
- **THEN** a visually-hidden `sr-only` span containing the tooltip text is included in the DOM

### Requirement: PrivacyBadge is used on all invoice form fields
The invoice creation form SHALL display a `PrivacyBadge` inline after each field label, using the correct level(s) per the field visibility map.

#### Scenario: Private field shows amber lock badge
- **WHEN** the Invoice Number, Description, or Internal Notes label is rendered
- **THEN** a single `private` badge (Lock icon, amber) appears after the label text

#### Scenario: Factor-only field shows violet briefcase badge
- **WHEN** the Payment Currency or Due Date label is rendered
- **THEN** a single `factor` badge (Briefcase icon, violet) appears after the label text

#### Scenario: Multi-audience field shows two badges
- **WHEN** the Invoice Amount or Debtor Address label is rendered
- **THEN** both a `factor` badge and a `debtor` badge appear after the label text

#### Scenario: Attached document section shows factor badge
- **WHEN** the document upload section description is rendered
- **THEN** a `factor` badge appears inline in the description

### Requirement: Data visibility legend is available in the form sidebar
The invoice creation form sidebar SHALL include a collapsible "Data visibility guide" card listing all four privacy levels with their icons and one-sentence descriptions.

#### Scenario: Legend is collapsed by default
- **WHEN** the form first renders
- **THEN** the legend content is hidden and only the trigger row ("Data visibility guide") is visible

#### Scenario: Legend expands on click
- **WHEN** the user clicks the "Data visibility guide" trigger
- **THEN** all four privacy levels are shown with their icon, name, and description
