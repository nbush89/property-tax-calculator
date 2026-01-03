/**
 * Utility functions for state name formatting and validation
 */

export function formatStateName(stateSlug: string): string {
  // Convert slug to display name
  // e.g., "new-jersey" -> "New Jersey"
  return stateSlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function slugifyStateName(stateName: string): string {
  // Convert display name to slug
  // e.g., "New Jersey" -> "new-jersey"
  return stateName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function getStateAbbreviation(stateSlug: string): string {
  // Map state slugs to abbreviations
  const stateMap: Record<string, string> = {
    'new-jersey': 'NJ',
    'new-york': 'NY',
    'california': 'CA',
    'texas': 'TX',
    'florida': 'FL',
    'pennsylvania': 'PA',
    'illinois': 'IL',
    'ohio': 'OH',
    'georgia': 'GA',
    'north-carolina': 'NC',
    'michigan': 'MI',
    // Add more states as needed
  }
  
  return stateMap[stateSlug] || stateSlug.toUpperCase().slice(0, 2)
}

export function isValidState(stateSlug: string): boolean {
  // List of supported states (can be expanded)
  const supportedStates = [
    'new-jersey',
    // Add more states as they're implemented
  ]
  
  return supportedStates.includes(stateSlug.toLowerCase())
}

