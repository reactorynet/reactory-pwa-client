import ObjectMapper, { getKeyValue, setKeyValue, parse, split } from './objectMapper';

// Test basic object mapping
const source = {
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    profile: {
      age: 30,
      city: 'New York'
    }
  },
  settings: {
    theme: 'dark',
    notifications: true
  }
};

const mapping = {
  'user.name': 'name',
  'user.email': 'email',
  'user.profile.age': 'age',
  'user.profile.city': 'location',
  'settings.theme': 'preferences.theme'
};

const result = ObjectMapper(source, mapping);
console.log('Basic mapping result:', result);

// Test array mapping
const arraySource = {
  users: [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
    { name: 'Charlie', age: 35 }
  ]
};

const arrayMapping = {
  'users[].name': 'names[]',
  'users[].age': 'ages[]'
};

const arrayResult = ObjectMapper(arraySource, arrayMapping);
console.log('Array mapping result:', arrayResult);

// Test getKeyValue function
const extractedValue = getKeyValue(source, 'user.profile.age');
console.log('Extracted value:', extractedValue);

// Test parse function
const parsedKeys = parse('user.profile[0].name');
console.log('Parsed keys:', parsedKeys);

// Test split function
const splitResult = split('user\\.profile.name', '.');
console.log('Split result:', splitResult);

export { result, arrayResult, extractedValue, parsedKeys, splitResult }; 