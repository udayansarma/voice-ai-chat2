// Utility for generating random names based on persona and gender
export interface GeneratedName {
  first: string;
  last: string;
  full: string;
  gender: 'male' | 'female';
  origin?: string;
}

// Diverse male first names from various cultural backgrounds
const maleFirstNames = [
  // Traditional American/European
  'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
  'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth',
  'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob',
  
  // Modern/Trendy
  'Liam', 'Noah', 'Oliver', 'Elijah', 'Lucas', 'Mason', 'Logan', 'Alexander', 'Ethan', 'Benjamin',
  'Sebastian', 'Hunter', 'Jackson', 'Aiden', 'Owen', 'Samuel', 'Gabriel', 'Carter', 'Wyatt', 'Julian',
  
  // Hispanic/Latino
  'Jose', 'Luis', 'Carlos', 'Juan', 'Miguel', 'Antonio', 'Francisco', 'Manuel', 'Alejandro', 'Diego',
  'Fernando', 'Jorge', 'Ricardo', 'Eduardo', 'Rafael', 'Oscar', 'Sergio', 'Pablo', 'Roberto', 'Hector',
  
  // African American
  'Malik', 'Jamal', 'Darius', 'Terrell', 'Marcus', 'Dominique', 'Xavier', 'Isaiah', 'Andre', 'Devin',
  'Rashad', 'Quinton', 'Tyrone', 'Jerome', 'Antoine', 'Damien', 'Elijah', 'Jalen', 'Cameron', 'Devon',
  
  // Asian
  'Wei', 'Jin', 'Akira', 'Hiroshi', 'Kenji', 'Raj', 'Arjun', 'Vikram', 'Amit', 'Ravi',
  'Chen', 'Ming', 'Jun', 'Kento', 'Yuki', 'Sato', 'Dev', 'Neil', 'Rohan', 'Aarav',
  
  // Middle Eastern/Arabic
  'Omar', 'Hassan', 'Ahmed', 'Ali', 'Mohammad', 'Khalil', 'Samir', 'Tariq', 'Yusuf', 'Zaid',
  'Ameer', 'Farid', 'Karim', 'Nader', 'Rashid', 'Salim', 'Tarik', 'Walid', 'Yasir', 'Zain',
  
  // European Variations
  'Alessandro', 'Dimitri', 'Franz', 'Klaus', 'Pierre', 'Sven', 'Nikolai', 'Magnus', 'Luciano', 'Matteo'
];

// Diverse female first names from various cultural backgrounds
const femaleFirstNames = [
  // Traditional American/European
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Lisa', 'Nancy', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle',
  'Laura', 'Kimberly', 'Deborah', 'Dorothy', 'Amy', 'Angela', 'Ashley', 'Brenda', 'Emma', 'Olivia',
  
  // Modern/Trendy
  'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia', 'Harper', 'Evelyn',
  'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila', 'Luna', 'Sofia', 'Avery', 'Mila', 'Aria',
  'Scarlett', 'Penelope', 'Layla', 'Chloe', 'Victoria', 'Madison', 'Eleanor', 'Grace', 'Nora', 'Riley',
  
  // Hispanic/Latina
  'Maria', 'Carmen', 'Rosa', 'Ana', 'Isabel', 'Elena', 'Sofia', 'Lucia', 'Esperanza', 'Guadalupe',
  'Catalina', 'Valentina', 'Gabriela', 'Alejandra', 'Daniela', 'Andrea', 'Fernanda', 'Mariana', 'Camila', 'Paola',
  
  // African American
  'Aaliyah', 'Zara', 'Nia', 'Keisha', 'Tamara', 'Jasmine', 'Destiny', 'Diamond', 'Imani', 'Jada',
  'Kenya', 'Layla', 'Maya', 'Naomi', 'Raven', 'Serenity', 'Tiana', 'Amara', 'Kendra', 'Sasha',
  
  // Asian
  'Mei', 'Li', 'Yuki', 'Sakura', 'Akiko', 'Priya', 'Asha', 'Kavya', 'Riya', 'Anita',
  'Xiao', 'Ling', 'Hana', 'Yumi', 'Keiko', 'Sari', 'Deepa', 'Nisha', 'Pooja', 'Shreya',
  
  // Middle Eastern/Arabic
  'Fatima', 'Aisha', 'Layla', 'Zara', 'Amira', 'Nadia', 'Yasmin', 'Leila', 'Salma', 'Dina',
  'Hala', 'Iman', 'Jana', 'Lina', 'Mona', 'Rana', 'Rima', 'Samar', 'Tala', 'Zeina',
  
  // European Variations
  'Alessandra', 'Anastasia', 'Brigitte', 'Camille', 'Francesca', 'Ingrid', 'Katarina', 'Margot', 'Natasha', 'Vivienne'
];

// Diverse last names from various cultural backgrounds
const lastNames = [
  // Common American/European
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
  'Robinson', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  
  // Hispanic/Latino
  'Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Cruz',
  'Flores', 'Gomez', 'Chavez', 'Diaz', 'Reyes', 'Morales', 'Jimenez', 'Silva', 'Castro', 'Vargas',
  'Ruiz', 'Herrera', 'Medina', 'Aguilar', 'Gutierrez', 'Mendoza', 'Vega', 'Delgado', 'Ortiz', 'Ramos',
  
  // African American
  'Washington', 'Jefferson', 'Franklin', 'Jackson', 'Coleman', 'Freeman', 'Bryant', 'Washington', 'Banks', 'Woods',
  'Coleman', 'Hamilton', 'Russell', 'Griffin', 'Ward', 'Foster', 'Perry', 'Powell', 'Jenkins', 'Bell',
  
  // Asian
  'Chang', 'Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Wu', 'Huang', 'Zhou',
  'Kim', 'Park', 'Choi', 'Jung', 'Kang', 'Tanaka', 'Sato', 'Suzuki', 'Takahashi', 'Watanabe',
  'Patel', 'Singh', 'Sharma', 'Kumar', 'Gupta', 'Shah', 'Mehta', 'Jain', 'Agarwal', 'Verma',
  
  // Middle Eastern/Arabic
  'Hassan', 'Al-Ahmad', 'Mahmoud', 'Mohammed', 'Al-Hassan', 'Ibrahim', 'Al-Rashid', 'Khalil', 'Mansour', 'Qasemi',
  'Farah', 'Nasser', 'Saleh', 'Omar', 'Zayed', 'Badawi', 'Khoury', 'Habib', 'Sayegh', 'Taha',
  
  // European Variations
  'Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
  'Dubois', 'Martin', 'Bernard', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux',
  'Petrov', 'Ivanov', 'Sidorov', 'Kuznetsov', 'Popov', 'Volkov', 'Sokolov', 'Mikhailov', 'Fedorov', 'Morozov'
];

// Cultural name groupings for more authentic combinations
const culturalNameSets = {
  'american': {
    male: ['James', 'John', 'Robert', 'Michael', 'David', 'William', 'Christopher', 'Matthew', 'Joshua', 'Andrew'],
    female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Jessica', 'Sarah', 'Lisa', 'Ashley', 'Emily'],
    surnames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor']
  },
  'hispanic': {
    male: ['Jose', 'Luis', 'Carlos', 'Juan', 'Miguel', 'Antonio', 'Francisco', 'Manuel', 'Alejandro', 'Diego'],
    female: ['Maria', 'Carmen', 'Rosa', 'Ana', 'Isabel', 'Elena', 'Sofia', 'Lucia', 'Gabriela', 'Valentina'],
    surnames: ['Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Cruz']
  },
  'asian': {
    male: ['Wei', 'Jin', 'Chen', 'Ming', 'Akira', 'Hiroshi', 'Raj', 'Arjun', 'Vikram', 'Dev'],
    female: ['Mei', 'Li', 'Yuki', 'Sakura', 'Priya', 'Asha', 'Kavya', 'Riya', 'Xiao', 'Hana'],
    surnames: ['Chang', 'Chen', 'Wang', 'Li', 'Kim', 'Park', 'Tanaka', 'Sato', 'Patel', 'Singh']
  },
  'african': {
    male: ['Malik', 'Jamal', 'Darius', 'Marcus', 'Xavier', 'Isaiah', 'Andre', 'Cameron', 'Elijah', 'Jalen'],
    female: ['Aaliyah', 'Zara', 'Nia', 'Jasmine', 'Imani', 'Jada', 'Maya', 'Naomi', 'Amara', 'Kendra'],
    surnames: ['Washington', 'Jefferson', 'Coleman', 'Freeman', 'Bryant', 'Hamilton', 'Griffin', 'Foster', 'Powell', 'Bell']
  },
  'arabic': {
    male: ['Omar', 'Hassan', 'Ahmed', 'Ali', 'Mohammad', 'Khalil', 'Samir', 'Tariq', 'Yusuf', 'Ameer'],
    female: ['Fatima', 'Aisha', 'Layla', 'Zara', 'Amira', 'Nadia', 'Yasmin', 'Leila', 'Salma', 'Dina'],
    surnames: ['Hassan', 'Al-Ahmad', 'Mahmoud', 'Mohammed', 'Ibrahim', 'Khalil', 'Mansour', 'Farah', 'Nasser', 'Omar']
  },
  'european': {
    male: ['Alessandro', 'Dimitri', 'Franz', 'Klaus', 'Pierre', 'Sven', 'Nikolai', 'Magnus', 'Luciano', 'Matteo'],
    female: ['Alessandra', 'Anastasia', 'Brigitte', 'Camille', 'Francesca', 'Ingrid', 'Katarina', 'Margot', 'Natasha', 'Vivienne'],
    surnames: ['Mueller', 'Schmidt', 'Rossi', 'Russo', 'Dubois', 'Martin', 'Petrov', 'Ivanov', 'Ferrari', 'Romano']
  }
};

export interface NameGenerationOptions {
  gender?: 'male' | 'female';
  culturalBackground?: keyof typeof culturalNameSets | 'mixed';
  ageGroup?: 'young' | 'middle' | 'senior';
  modern?: boolean;
}

// Function overloads for backward compatibility
export function generateRandomName(gender?: 'male' | 'female'): GeneratedName;
export function generateRandomName(options?: NameGenerationOptions): GeneratedName;
export function generateRandomName(genderOrOptions?: 'male' | 'female' | NameGenerationOptions): GeneratedName {
  // Handle legacy function signature
  if (typeof genderOrOptions === 'string' || genderOrOptions === undefined) {
    const options: NameGenerationOptions = { gender: genderOrOptions };
    return generateRandomNameInternal(options);
  }
  
  // Handle new options object
  return generateRandomNameInternal(genderOrOptions);
}

function generateRandomNameInternal(options: NameGenerationOptions = {}): GeneratedName {
  const { gender, culturalBackground = 'mixed', ageGroup, modern = false } = options;
  
  let firstNamePool: string[];
  let lastNamePool: string[];
  let selectedGender: 'male' | 'female';
  let origin: string = 'mixed';
  
  // Determine gender
  if (gender === 'male') {
    selectedGender = 'male';
  } else if (gender === 'female') {
    selectedGender = 'female';
  } else {
    selectedGender = Math.random() > 0.5 ? 'male' : 'female';
  }
  
  // Select name pools based on cultural background
  if (culturalBackground === 'mixed') {
    // Use the full diverse pools
    firstNamePool = selectedGender === 'male' ? maleFirstNames : femaleFirstNames;
    lastNamePool = lastNames;
    origin = 'mixed';
  } else {
    // Use specific cultural set
    const culturalSet = culturalNameSets[culturalBackground];
    firstNamePool = culturalSet[selectedGender];
    lastNamePool = culturalSet.surnames;
    origin = culturalBackground;
  }
  
  // Apply age group filtering for more realistic names
  if (ageGroup) {
    firstNamePool = filterNamesByAge(firstNamePool, ageGroup, selectedGender);
  }
  
  // Apply modern filtering if requested
  if (modern && culturalBackground === 'mixed') {
    firstNamePool = filterModernNames(firstNamePool, selectedGender);
  }
  
  const firstName = getRandomFromArray(firstNamePool);
  const lastName = getRandomFromArray(lastNamePool);
  
  return {
    first: firstName,
    last: lastName,
    full: `${firstName} ${lastName}`,
    gender: selectedGender,
    origin: origin
  };
}

function getRandomFromArray<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function filterNamesByAge(names: string[], ageGroup: 'young' | 'middle' | 'senior', gender: 'male' | 'female'): string[] {
  // Names more common in different age groups
  const youngNames = {
    male: ['Liam', 'Noah', 'Oliver', 'Elijah', 'Lucas', 'Mason', 'Logan', 'Alexander', 'Ethan', 'Benjamin', 'Sebastian', 'Hunter', 'Jackson', 'Aiden', 'Owen', 'Samuel', 'Gabriel', 'Carter', 'Wyatt', 'Julian'],
    female: ['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila', 'Luna', 'Sofia', 'Avery', 'Mila', 'Aria']
  };
  
  const seniorNames = {
    male: ['Robert', 'Richard', 'Charles', 'Donald', 'Kenneth', 'Ronald', 'George', 'Edward', 'Harold', 'Frank', 'Raymond', 'Gerald', 'Walter', 'Arthur', 'Eugene', 'Wayne', 'Ralph', 'Roy', 'Louis', 'Philip'],
    female: ['Mary', 'Patricia', 'Linda', 'Barbara', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Nancy', 'Dorothy', 'Brenda', 'Margaret', 'Carolyn', 'Janet', 'Maria', 'Catherine', 'Frances']
  };
  
  if (ageGroup === 'young') {
    const ageSpecificNames = youngNames[gender];
    return names.filter(name => ageSpecificNames.includes(name)).length > 0 
      ? names.filter(name => ageSpecificNames.includes(name))
      : names; // Fallback to all names if no matches
  } else if (ageGroup === 'senior') {
    const ageSpecificNames = seniorNames[gender];
    return names.filter(name => ageSpecificNames.includes(name)).length > 0
      ? names.filter(name => ageSpecificNames.includes(name))
      : names; // Fallback to all names if no matches
  }
  
  return names; // middle age gets all names
}

function filterModernNames(names: string[], gender: 'male' | 'female'): string[] {
  const modernNames = {
    male: ['Liam', 'Noah', 'Oliver', 'Elijah', 'Lucas', 'Mason', 'Logan', 'Alexander', 'Ethan', 'Benjamin', 'Sebastian', 'Hunter', 'Jackson', 'Aiden', 'Owen', 'Samuel', 'Gabriel', 'Carter', 'Wyatt', 'Julian', 'Xavier', 'Isaiah', 'Cameron', 'Devon'],
    female: ['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila', 'Luna', 'Sofia', 'Avery', 'Mila', 'Aria', 'Aaliyah', 'Zara', 'Maya', 'Amara']
  };
  
  const modernSet = modernNames[gender];
  const filtered = names.filter(name => modernSet.includes(name));
  return filtered.length > 0 ? filtered : names; // Fallback if no modern names found
}

export function getGenderFromVoice(voiceName: string): 'male' | 'female' {
  const maleVoices = ['andrew', 'brian', 'christopher', 'eric', 'guy', 'jacob', 'john', 'ryan'];
  const voiceLower = voiceName.toLowerCase();
  
  for (const male of maleVoices) {
    if (voiceLower.includes(male)) {
      return 'male';
    }
  }
  
  return 'female'; // Default to female if not found in male list
}

// Additional convenience functions for enhanced name generation
export function generateNameByCulture(culture: keyof typeof culturalNameSets, gender?: 'male' | 'female'): GeneratedName {
  return generateRandomName({ culturalBackground: culture, gender });
}

export function generateModernName(gender?: 'male' | 'female'): GeneratedName {
  return generateRandomName({ modern: true, gender });
}

export function generateNameByAge(ageGroup: 'young' | 'middle' | 'senior', gender?: 'male' | 'female'): GeneratedName {
  return generateRandomName({ ageGroup, gender });
}

export function generateDiverseNames(count: number = 10): GeneratedName[] {
  const names: GeneratedName[] = [];
  const cultures = Object.keys(culturalNameSets) as (keyof typeof culturalNameSets)[];
  
  for (let i = 0; i < count; i++) {
    const randomCulture = Math.random() < 0.3 ? cultures[Math.floor(Math.random() * cultures.length)] : 'mixed';
    const randomGender = Math.random() > 0.5 ? 'male' : 'female';
    const randomAge = Math.random() < 0.3 ? ['young', 'middle', 'senior'][Math.floor(Math.random() * 3)] as 'young' | 'middle' | 'senior' : undefined;
    
    names.push(generateRandomName({
      culturalBackground: randomCulture,
      gender: randomGender,
      ageGroup: randomAge,
      modern: Math.random() < 0.4
    }));
  }
  
  return names;
}

export function getAvailableCultures(): string[] {
  return Object.keys(culturalNameSets);
}

export function inferGenderFromPersona(persona: any): 'male' | 'female' | undefined {
  if (!persona) return undefined;
  
  // Check if persona has explicit gender in demographics
  if (persona.demographics?.gender) {
    const gender = persona.demographics.gender.toLowerCase();
    if (gender === 'male' || gender === 'female') {
      return gender as 'male' | 'female';
    }
  }
  
  // Try to infer from persona name
  const name = persona.name?.toLowerCase() || '';
  
  // Common gendered persona indicators
  const maleIndicators = ['man', 'father', 'dad', 'husband', 'guy', 'mr', 'gentleman'];
  const femaleIndicators = ['woman', 'mother', 'mom', 'wife', 'lady', 'mrs', 'ms', 'girl'];
  
  for (const indicator of maleIndicators) {
    if (name.includes(indicator)) return 'male';
  }
  
  for (const indicator of femaleIndicators) {
    if (name.includes(indicator)) return 'female';
  }
  
  // No clear indication
  return undefined;
}
