# BD Customer Tracking System Guide

## Overview

This system helps the Business Development team track, rank, and prioritize enterprise partnership applications received through the [Enterprise Partnership Program form](https://forms.gle/XNeELYavjwoJwPEf7).

## Files

### `bd-customer-tracking.md` (Template)
- **Purpose**: Template file for tracking enterprise customers
- **Status**: Version controlled (committed to repo)
- **Contains**: Empty template with scoring criteria and pipeline stages
- **Use**: Reference for structure and scoring methodology

### `bd-customer-tracking-live.md` (Active Tracking)
- **Purpose**: Live document with actual customer data
- **Status**: Gitignored (not committed to repo)
- **Contains**: Real customer information and pipeline status
- **Use**: Day-to-day customer tracking and prioritization

## Getting Started

### 1. Create Your Live Tracking File

Copy the template to create your live tracking document:

```bash
cp bd-customer-tracking.md bd-customer-tracking-live.md
```

This file is automatically ignored by git to keep customer data private.

### 2. Receiving New Applications

When a new enterprise partnership application comes through the form:

1. **Add to Pipeline Table**: Create a new row in the "Active Pipeline" table
2. **Calculate Priority Score**: Use the scoring criteria (0-100 points)
3. **Set Status**: Mark as 🟠 Pending Review initially
4. **Assign Rank**: Order by priority score (highest first)

### 3. Scoring New Leads

Use the four-factor scoring system:

#### Volume Score (40 points max)
Based on stated daily processing volume

#### Strategic Fit (25 points max)
Evaluate ecosystem impact and brand value

#### Revenue Potential (20 points max)
Estimate fee revenue and revenue share opportunities

#### Technical Readiness (15 points max)
Assess how soon they can integrate

**Example Calculation:**
- Company X: $7M daily volume = 35 points
- High brand value (wallet provider) = 25 points
- Strong revenue share opportunity = 20 points
- Ready to integrate immediately = 15 points
- **Total: 95 points (Priority Rank #1)**

### 4. Pipeline Management

#### Status Updates
Update lead status as they progress:
- 🟠 Pending Review → 🟡 Qualified → 🟢 Active Lead → ✅ Closed-Won

#### Weekly Reviews
Every week:
1. Update all statuses
2. Re-rank based on new information
3. Follow up with top 5 leads
4. Move stale leads to 🔵 Nurture status

#### Moving to Archive
When a lead is closed (won or lost):
1. Move row from Active Pipeline to Archive table
2. Record final outcome and notes
3. Keep for historical reference

### 5. Best Practices

#### Response Times
- **$2M+ volume**: Respond within 4 hours, escalate to leadership
- **$1M-$2M volume**: Respond within 24 hours
- **$500K-$1M volume**: Respond within 48 hours

#### Documentation
- Keep detailed notes in the "Notes" column
- Document all key conversations and decisions
- Track any blockers or concerns

#### Follow-ups
- Active leads: Check in every 3-5 days
- Nurture leads: Quarterly touchpoint
- Pending review: Initial outreach within 48 hours

## Pipeline Stages

### Stage 1: Initial Review (24-48 hours)
- Review submission
- Calculate score
- Determine if qualified
- Schedule call if meets criteria

### Stage 2: Discovery Call
- Understand use case
- Validate volume
- Identify decision makers
- Assess technical needs

### Stage 3: Technical Assessment
- Integration requirements
- SLA discussions
- Timeline estimation
- Custom contract terms

### Stage 4: Proposal & Negotiation
- Send proposal
- Negotiate terms
- Legal review
- Finalize contract

### Stage 5: Onboarding
- Integration support
- Assign account manager
- Launch partnership

## Reporting

### Monthly Metrics to Track
- New applications received
- Qualified leads
- Active conversations
- Closed-won partnerships
- Average deal cycle time
- Conversion rate (applications → partnerships)

### Quarterly Review
- Analyze scoring accuracy
- Refine criteria if needed
- Review closed-lost deals for patterns
- Update best practices

## Tips for Success

1. **Prioritize ruthlessly**: Focus on top 5 leads at any time
2. **Update religiously**: Keep data current to make good decisions
3. **Document everything**: Future you will thank present you
4. **Move fast on top leads**: High-value leads get snatched up quickly
5. **Nurture relationships**: Even "no" today can be "yes" later

## Questions?

Contact the BD team lead or refer to the template file for detailed scoring criteria.
