import type { CourseCode, CurriculumItem } from "./types";

const sourceFiles: Record<CourseCode, Record<"theory" | "lab", string>> = {
  JAVA: {
    theory: "KGR25 B.Tech Object Oriented Programming Through JAVA - Theory",
    lab: "KGR25 B.Tech Object Oriented Programming Through JAVA - Lab",
  },
  DBMS: {
    theory: "Database Management Systems - Theory - KGR25",
    lab: "Database Management Systems - Lab - KGR25",
  },
};

function theoryItem(
  courseCode: CourseCode,
  unit: number,
  title: string,
  brief: string,
  outcomes: string[],
): CurriculumItem {
  return {
    id: `${courseCode.toLowerCase()}-theory-${unit}`,
    courseCode,
    track: "theory",
    sequence: unit,
    unit,
    label: `Unit ${unit}`,
    title,
    brief,
    outcomes,
    suggestedMarks: 10,
    source: sourceFiles[courseCode].theory,
    starterCode: `Key concepts:\n\nWorked example:\n\nReasoning and conclusion:\n`,
  };
}

function labItem(
  courseCode: CourseCode,
  sequence: number,
  title: string,
  brief: string,
  outcomes: string[],
  expectedOutput?: string,
): CurriculumItem {
  const starterCode =
    courseCode === "JAVA"
      ? `public class Main {\n  public static void main(String[] args) {\n    // ${title}\n  }\n}\n`
      : `-- ${title}\n-- Define the required schema or query below.\n`;
  return {
    id: `${courseCode.toLowerCase()}-lab-${sequence}`,
    courseCode,
    track: "lab",
    sequence,
    unit: labUnit(courseCode, sequence),
    label: `Experiment ${sequence}`,
    title,
    brief,
    outcomes,
    suggestedMarks: 10,
    source: sourceFiles[courseCode].lab,
    starterCode,
    expectedOutput,
  };
}

function labUnit(courseCode: CourseCode, sequence: number) {
  if (courseCode === "DBMS") {
    if (sequence === 1) return 1;
    if (sequence === 2) return 2;
    return 3;
  }
  if (sequence <= 3) return 1;
  if (sequence <= 8 || (sequence >= 13 && sequence <= 15)) return 2;
  if (sequence <= 12) return 3;
  if (sequence <= 19) return 4;
  return 5;
}

export const curriculumCatalog: CurriculumItem[] = [
  theoryItem(
    "JAVA",
    1,
    "Java Basics and Object-Oriented Foundations",
    "Study object-oriented thinking, Java language fundamentals, control structures, arrays, classes, objects, constructors, methods, access control, overloading, inheritance, recursion, nested classes, and strings.",
    [
      "Explain core OOP abstractions",
      "Develop programs using classes, constructors, control flow, and arrays",
      "Apply overloading, inheritance, recursion, and string handling",
    ],
  ),
  theoryItem(
    "JAVA",
    2,
    "Inheritance, Packages, Interfaces, and I/O",
    "Apply inheritance hierarchies, member access, super and final, runtime polymorphism, abstract classes, packages, CLASSPATH, interfaces, and the java.io package.",
    [
      "Design reusable inheritance hierarchies",
      "Implement packages and interfaces",
      "Use polymorphism and Java I/O appropriately",
    ],
  ),
  theoryItem(
    "JAVA",
    3,
    "Exceptions, Multithreading, Utilities, and Generics",
    "Use Java exception handling, custom exceptions, string and utility APIs, thread lifecycle and synchronization, inter-thread communication, enumerations, autoboxing, annotations, and generics.",
    [
      "Handle built-in and custom exceptions",
      "Develop synchronized multithreaded programs",
      "Apply utility classes and generic types",
    ],
  ),
  theoryItem(
    "JAVA",
    4,
    "Event Handling and AWT",
    "Work with event sources, listeners, adapter classes, mouse and keyboard events, AWT components, graphics, menus, dialogs, and layout managers.",
    [
      "Apply the delegation event model",
      "Build event-driven AWT interfaces",
      "Select suitable layout managers and components",
    ],
  ),
  theoryItem(
    "JAVA",
    5,
    "Applets and Swing",
    "Study applet lifecycle and parameters as required by the syllabus, then build Swing interfaces using MVC concepts, frames, components, controls, panes, trees, and tables.",
    [
      "Explain the legacy applet lifecycle",
      "Compare AWT and Swing",
      "Construct a component-based Swing user interface",
    ],
  ),

  theoryItem(
    "DBMS",
    1,
    "Database Systems and ER Design",
    "Compare file systems and DBMSs, explain data models and abstraction, and develop conceptual database designs using entities, attributes, relationships, constraints, and ER diagrams.",
    [
      "Explain DBMS architecture and data independence",
      "Identify entities, attributes, and relationships",
      "Develop a conceptual ER design",
    ],
  ),
  theoryItem(
    "DBMS",
    2,
    "Relational Model and Relational Algebra",
    "Apply integrity constraints, relational queries, logical database design, views, relational algebra, tuple relational calculus, and domain relational calculus.",
    [
      "Enforce relational integrity constraints",
      "Express queries using relational algebra",
      "Explain tuple and domain relational calculus",
    ],
  ),
  theoryItem(
    "DBMS",
    3,
    "SQL, Triggers, and Schema Refinement",
    "Write advanced SQL with set operations, nested queries, aggregation, NULL handling, constraints, and triggers, then refine schemas using dependencies, normal forms, and lossless decomposition.",
    [
      "Formulate advanced SQL queries",
      "Implement constraints and triggers",
      "Normalize schemas through 5NF and BCNF",
    ],
  ),
  theoryItem(
    "DBMS",
    4,
    "Transactions, Concurrency, and Recovery",
    "Analyze transaction states, atomicity, durability, serializability, recoverability, locking, timestamps, validation, multiple granularity, and log-based recovery.",
    [
      "Test schedules for serializability",
      "Compare concurrency-control protocols",
      "Explain transaction recovery and atomicity",
    ],
  ),
  theoryItem(
    "DBMS",
    5,
    "Storage, File Organization, and Indexing",
    "Evaluate external storage, file organizations, clustered, primary, and secondary indexes, hashing, tree indexes, ISAM, and dynamic B+ tree structures.",
    [
      "Compare file organizations",
      "Select hash or tree-based indexes",
      "Explain ISAM and B+ tree operations",
    ],
  ),

  labItem(
    "DBMS",
    1,
    "Conceptual Design with the ER Model",
    "Analyze a domain, identify entities and relationships, state cardinality and participation constraints, and submit a complete ER design.",
    [
      "Create an ER model from requirements",
      "Document keys and relationship constraints",
    ],
    "ER diagram with entities (rectangles), attributes (ellipses), relationships (diamonds), cardinality notations (1, N, M), and participation constraints (single/double lines) clearly labeled.",
  ),
  labItem(
    "DBMS",
    2,
    "Relational Model",
    "Convert an ER design into relations with primary keys, foreign keys, domains, and integrity constraints.",
    [
      "Map ER constructs to relations",
      "Define relational integrity constraints",
    ],
    "Relational schema with table names, columns, primary keys (underlined), foreign key references, and domain constraints listed for each relation.",
  ),
  labItem(
    "DBMS",
    3,
    "Normalization",
    "Identify functional dependencies and normalize a supplied schema while demonstrating lossless decomposition.",
    [
      "Find candidate keys",
      "Normalize relations to an appropriate normal form",
    ],
    "List of functional dependencies, candidate keys, decomposed relations in 3NF/BCNF, and proof of lossless decomposition (common attribute is a key in one relation).",
  ),
  labItem(
    "DBMS",
    4,
    "Practice DDL Commands",
    "Create and alter database objects using CREATE, ALTER, DROP, constraints, and suitable data types.",
    ["Write valid DDL statements", "Apply keys and integrity constraints"],
    "Successful execution of CREATE TABLE, ALTER TABLE (add/modify/drop column), and DROP TABLE with constraint definitions verified by DESCRIBE or schema inspection.",
  ),
  labItem(
    "DBMS",
    5,
    "Practice DML Commands",
    "Insert, update, delete, and retrieve rows while preserving declared constraints.",
    ["Use core DML operations", "Verify data changes and constraint behavior"],
    "Rows inserted and displayed via SELECT; UPDATE and DELETE applied and verified; constraint violations rejected with appropriate error messages.",
  ),
  labItem(
    "DBMS",
    6,
    "Advanced SQL Predicates and Set Operations",
    "Write queries using ANY, ALL, IN, EXISTS, NOT EXISTS, UNION, INTERSECT, and constraints.",
    ["Use nested predicates correctly", "Combine compatible query results"],
    "Correct result sets for each predicate query, UNION and INTERSECT output with duplicates handled, and NOT EXISTS returning expected filtered rows.",
  ),
  labItem(
    "DBMS",
    7,
    "Aggregates, GROUP BY, HAVING, and Views",
    "Create aggregate reports using GROUP BY and HAVING, then create, query, and drop views.",
    ["Build grouped aggregate queries", "Create and manage views"],
    "Aggregate query results grouped correctly, HAVING filter applied, view created successfully and queryable, and view dropped without error.",
  ),
  labItem(
    "DBMS",
    8,
    "Insert, Delete, and Update Triggers",
    "Create and test triggers for insert, delete, and update operations with clearly documented effects.",
    ["Implement row-change triggers", "Test trigger behavior safely"],
    "Triggers created successfully; INSERT/UPDATE/DELETE operations fire triggers and produce documented side-effects (audit row, computed column update, or cascaded change).",
  ),
  labItem(
    "DBMS",
    9,
    "Stored Procedures",
    "Create parameterized stored procedures for a defined database operation and demonstrate successful and failure paths.",
    ["Create stored procedures", "Use parameters and transaction-safe logic"],
    "Stored procedure created and called with valid and invalid parameters; success path returns correct result; failure path raises exception or returns error code.",
  ),
  labItem(
    "DBMS",
    10,
    "Cursors",
    "Use explicit cursors to process multi-row results and document when set-based SQL would be preferable.",
    ["Declare and control a cursor", "Compare cursor and set-based approaches"],
    "Cursor opens, fetches each row in a loop, and closes cleanly; output shows all processed rows; student documents equivalent set-based query for comparison.",
  ),

  labItem(
    "JAVA",
    1,
    "IDE Setup and Prime Number Debugging",
    "Configure a Java IDE, create and run a project, use suggestions and formatting, refactor identifiers, and debug a program that finds prime numbers from 1 to n.",
    ["Use core IDE tooling", "Debug a Java control-flow program"],
    "Primes from 1 to 50:\n2 3 5 7 11 13 17 19 23 29 31 37 41 43 47",
  ),
  labItem(
    "JAVA",
    2,
    "Quadratic Equation Solutions",
    "Read coefficients a, b, and c and print all real solutions of ax^2 + bx + c = 0 using the quadratic formula.",
    ["Use input, arithmetic, and conditionals", "Handle discriminant cases"],
    "For a=1, b=-3, c=2:\nroot1 = 2.00\nroot2 = 1.00\n\nFor a=1, b=2, c=5:\nNo real roots (discriminant < 0)",
  ),
  labItem(
    "JAVA",
    3,
    "Matrix Multiplication",
    "Read two compatible matrices, multiply them, and print the result with dimension validation.",
    ["Use multidimensional arrays", "Implement matrix multiplication"],
    "Matrix A (2x2): [[1,2],[3,4]]\nMatrix B (2x2): [[5,6],[7,8]]\nResult:\n19 22\n43 50",
  ),
  labItem(
    "JAVA",
    4,
    "Inheritance, final, and Abstract Classes",
    "Demonstrate inheritance, prevent inheritance with final, and use an abstract base class with concrete subclasses.",
    ["Apply inheritance and final", "Implement an abstract class hierarchy"],
    "Animal sound: Generic sound\nDog sound: Woof\nCat sound: Meow\nFinal class cannot be subclassed - verified.\nAbstract method implemented in all concrete subclasses.",
  ),
  labItem(
    "JAVA",
    5,
    "Shape Area with Abstraction",
    "Create an abstract Shape class and Rectangle, Triangle, and Circle subclasses whose printArea methods calculate and display area.",
    ["Use abstract methods", "Apply runtime polymorphism"],
    "Rectangle area: 50.00\nTriangle area: 25.00\nCircle area: 78.54",
  ),
  labItem(
    "JAVA",
    6,
    "Method and Constructor Overloading",
    "Implement overloaded methods and constructors and demonstrate how Java selects the appropriate signature.",
    ["Implement compile-time polymorphism", "Design overloaded constructors"],
    "add(int, int) = 15\nadd(double, double) = 15.50\nadd(int, int, int) = 20\nConstructor with 1 arg: name=Alice\nConstructor with 2 args: name=Bob, age=20",
  ),
  labItem(
    "JAVA",
    7,
    "Method Overriding",
    "Create a superclass and subclasses that override behavior, then demonstrate dynamic method dispatch.",
    ["Override inherited methods", "Demonstrate runtime dispatch"],
    "Vehicle move: Moving generically\nCar move: Driving on road\nBike move: Riding on road\nDispatch confirms runtime type is used.",
  ),
  labItem(
    "JAVA",
    8,
    "Currency Converter with Interfaces",
    "Implement an interface-based converter for Dollar, Euro, and Yen values to INR.",
    [
      "Define and implement interfaces",
      "Separate conversion behavior from input handling",
    ],
    "1 USD = 83.50 INR\n1 EUR = 90.20 INR\n1 JPY = 0.56 INR",
  ),
  labItem(
    "JAVA",
    9,
    "User-Defined Exception Handling",
    "Define, throw, and handle a custom exception for an appropriate validation rule.",
    ["Create a custom exception", "Use throw, throws, try, and catch"],
    "Testing with age -5:\nCaught InvalidAgeException: Age cannot be negative.\nTesting with age 25:\nValid age: 25",
  ),
  labItem(
    "JAVA",
    10,
    "Division UI with Exception Handling",
    "Build a division interface that reports number-format and divide-by-zero errors in a message dialog.",
    [
      "Handle GUI input safely",
      "Report NumberFormatException and ArithmeticException",
    ],
    "Input: 10 / 2 â†’ Result dialog: 5.0\nInput: 10 / 0 â†’ Error dialog: ArithmeticException: Division by zero\nInput: abc / 2 â†’ Error dialog: NumberFormatException: Invalid number",
  ),
  labItem(
    "JAVA",
    11,
    "Three-Thread Number Processor",
    "Generate a random integer every second; compute its square on one thread when even and its cube on another when odd.",
    ["Create and coordinate threads", "Route work based on generated values"],
    "Generated: 4 (even) â†’ Square thread: 16\nGenerated: 7 (odd)  â†’ Cube thread: 343\nGenerated: 2 (even) â†’ Square thread: 4\nGenerated: 9 (odd)  â†’ Cube thread: 729",
  ),
  labItem(
    "JAVA",
    12,
    "Producer-Consumer Communication",
    "Implement producer-consumer coordination using Java inter-thread communication.",
    ["Synchronize shared state", "Use wait and notify correctly"],
    "Producer: produced 1\nConsumer: consumed 1\nProducer: produced 2\nConsumer: consumed 2\nProducer: produced 3\nConsumer: consumed 3",
  ),
  labItem(
    "JAVA",
    13,
    "Split a Text File into Parts",
    "Split a text file into n parts and name each output using the original name followed by a sequential .part suffix.",
    ["Read and write files", "Partition content deterministically"],
    "input.txt split into 3 parts:\ninput.txt.part1 created (lines 1-10)\ninput.txt.part2 created (lines 11-20)\ninput.txt.part3 created (lines 21-30)\nAll parts verified.",
  ),
  labItem(
    "JAVA",
    14,
    "File Information Inspector",
    "Read a file name and report existence, readability, writability, file type, and length in bytes.",
    ["Use the Java file API", "Handle missing and inaccessible paths"],
    "File: sample.txt\nExists: true\nReadable: true\nWritable: true\nIs directory: false\nSize: 1024 bytes",
  ),
  labItem(
    "JAVA",
    15,
    "JDBC CRUD Application",
    "Connect to a database with JDBC and implement add, delete, modify, and retrieve operations using safe statements.",
    ["Establish a JDBC connection", "Implement parameterized CRUD operations"],
    "Connected to database successfully.\nINSERT: Record added (id=1, name='Alice')\nSELECT: id=1, name='Alice'\nUPDATE: Record modified (name='Alicia')\nDELETE: Record id=1 removed.\nAll operations completed.",
  ),
  labItem(
    "JAVA",
    16,
    "Traffic Light Simulator",
    "Build a radio-button interface for Red, Yellow, and Green that displays STOP, READY, or GO in the selected color.",
    ["Handle radio-button events", "Update interface state and styling"],
    "Red selected â†’ Label text: STOP (displayed in red)\nYellow selected â†’ Label text: READY (displayed in yellow)\nGreen selected â†’ Label text: GO (displayed in green)",
  ),
  labItem(
    "JAVA",
    17,
    "Mouse Event Monitor",
    "Handle mouse events with adapter classes and display each event name at the center of the window.",
    ["Use mouse adapters", "Display event feedback"],
    "mouseClicked at (240, 180)\nmouseMoved at (300, 200)\nmouseDragged from (100, 100) to (200, 150)\nmouseEntered window\nmouseExited window",
  ),
  labItem(
    "JAVA",
    18,
    "Keyboard Event Handlers",
    "Demonstrate key pressed, released, and typed handlers with visible event details.",
    ["Implement key listeners", "Distinguish keyboard event types"],
    "Key Pressed: A (code=65)\nKey Typed: a\nKey Released: A (code=65)\nKey Pressed: ENTER (code=10)\nKey Released: ENTER (code=10)",
  ),
  labItem(
    "JAVA",
    19,
    "Grid Layout Calculator",
    "Build a calculator with GridLayout, arithmetic controls, a result field, and robust divide-by-zero handling.",
    [
      "Compose a GridLayout interface",
      "Handle arithmetic operations and errors",
    ],
    "10 + 5 = 15\n10 - 3 = 7\n4 * 6 = 24\n10 / 2 = 5\n10 / 0 â†’ Error: Cannot divide by zero",
  ),
  labItem(
    "JAVA",
    20,
    "Message Applet",
    "Develop the simple message applet required by the KGR25 syllabus and document the legacy runtime requirement.",
    ["Explain applet lifecycle methods", "Implement a basic applet display"],
    "Applet window displays: 'Welcome to Java Applet Programming'\nLifecycle methods init(), start(), paint(), stop(), destroy() implemented and documented.",
  ),
  labItem(
    "JAVA",
    21,
    "Factorial Applet",
    "Create the syllabus factorial applet with an integer input, Compute button, and result field, and document the legacy runtime requirement.",
    ["Handle applet input events", "Calculate factorial with validation"],
    "Input: 5 â†’ Factorial: 120\nInput: 0 â†’ Factorial: 1\nInput: -1 â†’ Error: Input must be a non-negative integer\nInput: 10 â†’ Factorial: 3628800",
  ),
];

export const curriculumSummary = {
  JAVA: { courseCode: "KG25ACM204 / KG25ACM207", theory: 5, lab: 21 },
  DBMS: { courseCode: "KG25ACD206 / KG25ACD209", theory: 5, lab: 10 },
} as const;

