// Syllabus sequence follows the four KGR25 PDFs. Tasks, fixtures, MCQs and hints
// below are editable teaching examples, not official model answers.
const javaStarter = "public class Main {\n  public static void main(String[] args) {\n    // Implement the task here.\n  }\n}\n";
const sqlStarter = "-- Create the sample tables and implement the task below.\n";
const make = (task, output, hints, options = {}) => ({
  task, output, hints, input: "", starterCode: sqlStarter,
  mode: "ide", environment: "runner", questions: [], ...options,
});
const java = (task, output, hints, options = {}) => make(task, output, hints, { starterCode: javaStarter, ...options });
const desktop = (task, output, hints) => java(task, output, hints, { environment: "external" });
const response = (task, output, hints) => make(task, output, hints, { mode: "response", environment: "external", starterCode: "Design / source:\n\nReasoning:\n\nObserved results:\n" });
const plsql = (task, output, hints) => make(task + "\nUse an instructor-provided Oracle PL/SQL lab database. Submit source and observed results; the portal does not provision Oracle sessions.", output, hints, { environment: "external" });

export const activityTemplates = {
  "dbms-lab-1": response(
    "Design a college course-enrollment ER model. Each student has a roll number, name and department. Each course has a code and title. A student can enroll in many courses; each course can have many students. Each enrollment records semester and grade. Identify keys, cardinality and participation, and provide a textual ER diagram or an accessible diagram link with explanation.",
    "Entities: Student(roll_no PK, name, department), Course(code PK, title).\nEnrollment relates Student and Course (M:N), with semester and grade.\nEach enrollment belongs to exactly one student and one course. State whether student/course participation is optional.",
    ["Separate entities from relationship attributes.", "Use an associative entity for the many-to-many relationship.", "Include semester in the enrollment key if repeat enrollments are allowed."]),
  "dbms-lab-2": make(
    "Map the enrollment ER model into Student, Course and Enrollment tables. Declare primary and foreign keys. Insert student (101, 'Asha'), course ('DBMS', 'Database Management Systems'), and enrollment (101, 'DBMS', '2026-I'). Query the joined student name and course code in roll-number order. Demonstrate that an enrollment for unknown student 999 is rejected, separately from the valid query.",
    "name | code\nAsha | DBMS",
    ["Create parent tables before the enrollment table.", "Use a composite enrollment key including semester.", "Join on declared keys, not names."]),
  "dbms-lab-3": response(
    "Normalize Enrollment(roll_no, student_name, course_code, course_title, faculty_id, faculty_name, grade). Given roll_no -> student_name; course_code -> course_title, faculty_id; faculty_id -> faculty_name; (roll_no, course_code) -> grade. Find a candidate key, identify partial/transitive dependencies, and decompose to 3NF. Explain why the decomposition is lossless and dependency preserving.",
    "Key: (roll_no, course_code).\nStudent(roll_no, student_name)\nFaculty(faculty_id, faculty_name)\nCourse(course_code, course_title, faculty_id)\nEnrollment(roll_no, course_code, grade)",
    ["Separate dependencies on only part of the composite key.", "Remove faculty_name from Course because of its transitive dependency.", "Show the primary/foreign-key joins that reconstruct Enrollment."]),
  "dbms-lab-4": make(
    "Create Student(roll_no integer primary key, name varchar(60) not null, marks integer check between 0 and 100). ALTER it to add department varchar(3). Insert (101, 'Asha', 82, 'CSE') and select all fields. Demonstrate invalid marks rejection in a separate statement. Create and DROP a temporary Practice table; do not drop Student before the final SELECT.",
    "roll_no | name | marks | department\n101 | Asha | 82 | CSE",
    ["Use CHECK (marks BETWEEN 0 AND 100).", "ALTER TABLE adds a column without recreating the table.", "Keep destructive examples limited to your practice schema."]),
  "dbms-lab-5": make(
    "Create Student(roll_no integer primary key, name varchar(60), marks integer). Insert (101,'Asha',70), (102,'Bala',65), (103,'Chitra',90). Increase Asha's marks by 5, delete roll 102, then list the remaining rows ORDER BY roll_no.",
    "roll_no | name | marks\n101 | Asha | 75\n103 | Chitra | 90",
    ["Use a WHERE clause in UPDATE and DELETE.", "Verify affected rows before running the final SELECT."]),
  "dbms-lab-6": make(
    "Create Student(id integer primary key, marks integer) with rows (1,80),(2,60),(3,90); Enrollment(student_id integer references Student(id), course varchar(8)) with (1,'JAVA'),(3,'DBMS'). Write separately labeled queries for IN, EXISTS, NOT EXISTS, > ANY, > ALL, UNION and INTERSECT. For ANY/ALL compare against enrolled students' marks. Sort result IDs. Explain duplicate removal and demonstrate an invalid foreign key in a separate test.",
    "IN / EXISTS: 1, 3\nNOT EXISTS: 2\n> ANY (80,90): 3\n> ALL (80,90): no rows\nUNION of enrolled IDs and marks>=80 IDs: 1, 3\nINTERSECT of JAVA IDs and marks>=80 IDs: 1",
    ["EXISTS tests whether a correlated subquery returns a row.", "ANY means at least one comparison succeeds; ALL requires every comparison.", "Use a PostgreSQL-compatible sandbox for ANY and ALL."]),
  "dbms-lab-7": make(
    "Create Marks(id integer, department varchar(3), score integer) with (1,'CSE',80),(2,'CSE',100),(3,'CSM',60). Report department, COUNT(*) and AVG(score), keeping groups with average >=75. Create a view HighScorers for score>=80, query it by id, then drop the view.",
    "department | count | average\nCSE | 2 | 90\nHighScorers IDs: 1, 2",
    ["WHERE filters rows; HAVING filters grouped results.", "A view stores a query definition, not a separate copy of rows."]),
  "dbms-lab-8": plsql(
    "Create Student(id NUMBER PRIMARY KEY, marks NUMBER) and AuditLog(student_id NUMBER, action VARCHAR2(10)). Create row-level INSERT, UPDATE and DELETE triggers recording the student id and action. Insert (1,70), update marks to 80, then delete id 1. Display audit rows in event order, using a sequence or identity audit key.",
    "student_id | action\n1 | INSERT\n1 | UPDATE\n1 | DELETE",
    ["Use :NEW for insert, :OLD for delete and both for update.", "Do not query the changing Student table from its row trigger.", "Use a deterministic audit sequence for display order."]),
  "dbms-lab-9": plsql(
    "Create Account(id NUMBER PRIMARY KEY, balance NUMBER CHECK(balance>=0)) with (1,1000),(2,500). Write transfer_amount(from_id,to_id,amount) validating positive amount, distinct existing accounts and sufficient balance. Transfer 200 from 1 to 2. Demonstrate a rejected transfer of 2000 without changing balances. Explain rollback behavior; the caller controls COMMIT.",
    "id | balance\n1 | 800\n2 | 700\nRejected transfer leaves balances unchanged.",
    ["Lock accounts in a consistent order.", "Validate before updating and roll back to a savepoint on failure.", "Use RAISE_APPLICATION_ERROR for invalid operations."]),
  "dbms-lab-10": plsql(
    "Create Student(id NUMBER, name VARCHAR2(60), marks NUMBER) with (1,'Asha',80),(2,'Bala',60). Use an explicit cursor ordered by id to print each name and marks and a total row count. Show OPEN, FETCH, EXIT WHEN and CLOSE. Compare this with a cursor FOR loop and a set-based SELECT.",
    "Asha 80\nBala 60\nRows processed: 2",
    ["Test cursor%NOTFOUND immediately after FETCH.", "Enable DBMS_OUTPUT in your Oracle client.", "Close the cursor even when handling an exception."]),
  "java-lab-1": java(
    "Set up a Java project in your lab IDE, try formatting and identifier refactoring, and step through a prime-number program with a breakpoint. In Main, read n and print primes from 2 through n separated by single spaces. For n<2 print 'No primes'. Sample n=10. Add debugger observations as source comments.",
    "2 3 5 7", ["Test divisors only while d*d<=candidate.", "1 is not prime.", "Reset the prime flag for every candidate."], { input: "10" }),
  "java-lab-2": java(
    "Read double coefficients a,b,c. Print real quadratic roots in descending order with two decimal places. Handle a=0 as a linear equation, and state 'No real roots' for negative discriminant. Sample coefficients: 1 -5 6.",
    "3.00 2.00", ["Compute b*b-4*a*c.", "Handle zero a before dividing by 2*a.", "Use Locale.ROOT when formatting decimal output."], { input: "1 -5 6" }),
  "java-lab-3": java(
    "Read matrix A dimensions and values, then B dimensions and values. Reject incompatible dimensions. Print the product row by row. Sample: A=[[1,2],[3,4]], B=[[5,6],[7,8]].",
    "19 22\n43 50", ["The inner dimensions must agree.", "Use three loops and initialize each output cell to zero."], { input: "2 2\n1 2\n3 4\n2 2\n5 6\n7 8" }),
  "java-lab-4": java(
    "Create abstract Employee with abstract role(), concrete Teacher returning 'Teacher', and final Principal returning 'Principal'. Invoke both through Employee references. Include a commented-out subclass of Principal and explain why it cannot compile; keep the submitted program compilable.",
    "Teacher\nPrincipal", ["A final class cannot be extended.", "An abstract class can contain both abstract and concrete methods."]),
  "java-lab-5": java(
    "Create abstract Shape with two integer dimensions and abstract printArea(). Implement Rectangle(4,5), Triangle(4,5), Circle(3,0), using the first dimension as radius for Circle. Print areas in that order, two decimal places, through Shape references.",
    "20.00\n10.00\n28.27", ["Triangle area is base*height/2.0.", "Use Math.PI for the circle.", "Do not instantiate Shape directly."]),
  "java-lab-6": java(
    "Implement overloaded Box constructors Box(), Box(int side), Box(int w,int h). Default dimensions are 1x1. Print the areas of new Box(), new Box(3), new Box(2,4). Also overload sum(int,int) and sum(double,double), demonstrating sum(2,3) and sum(2.5,3.5).",
    "1\n9\n8\n5\n6.0", ["Use this(...) to share constructor initialization.", "Overloading needs different parameter lists, not only different return types."]),
  "java-lab-7": java(
    "Create Vehicle with move(), Car overriding it to print 'Car moves on road', and Boat overriding it to print 'Boat moves on water'. Call move() through Vehicle references in Car, Boat order.",
    "Car moves on road\nBoat moves on water", ["Use @Override to catch signature errors.", "The runtime object determines which override executes."]),
  "java-lab-8": java(
    "Define CurrencyConverter with toINR(double amount). Implement Dollar, Euro and Yen converters. Use fixed teaching rates USD=83, EUR=90, JPY=0.56 INR, not live exchange rates. Convert 10 units of each and print two decimal places in USD, EUR, JPY order.",
    "830.00\n900.00\n5.60", ["Keep each conversion behind the interface.", "Multiply by the fixed rate.", "These constants are sample inputs, not financial quotations."]),
  "java-lab-9": java(
    "Define InvalidAgeException and a validateAge method that throws it for age<18. Read an integer age. Print 'Eligible' when valid; catch your custom exception and print 'Age must be at least 18' otherwise. Test 16 and 20.",
    "Age must be at least 18", ["Extend Exception for a checked exception.", "Keep throwing and handling in separate methods."], { input: "16" }),
  "java-lab-10": desktop(
    "Build the integer-division desktop UI from the syllabus: Num1 and Num2 input fields, Divide button, read-only Result field, and exception dialogs. Test 12/3, 12/0 and 'abc'/3. Submit Java source plus observed results in source comments. Run it in a desktop Java lab environment.",
    "12 / 3 -> Result: 4\n12 / 0 -> ArithmeticException dialog\nabc / 3 -> NumberFormatException dialog",
    ["Parse inputs with Integer.parseInt.", "Catch formatting and arithmetic failures separately.", "Create Swing components on the event-dispatch thread."]),
  "java-lab-11": desktop(
    "Implement three threads: a generator produces a random integer every second for five iterations; the square worker handles even values and the cube worker handles odd values. Add a deterministic test mode with inputs 2,3,4,5,6 and join all workers. Submit source and a trace. Use a local JVM because the timed run may exceed the portal runner timeout.",
    "Deterministic test results (order may vary):\n2 -> square 4\n3 -> cube 27\n4 -> square 16\n5 -> cube 125\n6 -> square 36",
    ["Use separate queues for even and odd work.", "Send a termination marker to both workers.", "Thread scheduling does not guarantee output ordering."]),
  "java-lab-12": java(
    "Implement a bounded, capacity-one buffer using synchronized, wait() and notifyAll(). One producer sends integers 1 through 5; one consumer prints only the consumed integers. Join both threads and terminate cleanly.",
    "1\n2\n3\n4\n5", ["Wait in a while loop checking the buffer condition.", "Call wait/notifyAll while holding the same monitor.", "Do not busy-wait or sleep while holding a lock."]),
  "java-lab-13": java(
    "Create input.txt containing exactly ABCDEFGH (UTF-8, no newline). Split its eight bytes into three balanced parts, giving earlier parts the extra bytes. Name files input.txt.part1, input.txt.part2, input.txt.part3. Print each name and content. Create fixtures within the program rather than accessing a personal file.",
    "input.txt.part1: ABC\ninput.txt.part2: DEF\ninput.txt.part3: GH",
    ["Use size/n and size%n for balanced part sizes.", "Close every stream with try-with-resources.", "Byte splitting may split a multibyte character; this fixture uses ASCII."]),
  "java-lab-14": desktop(
    "Read a file path and report existence, readability, writability, regular-file/directory type, and byte length. Test an eight-byte text file and a missing path in the college lab environment. Submit source and actual observations; permission flags depend on the operating system.",
    "For an accessible eight-byte regular file:\nexists=true\nreadable=true\nwritable=<actual permission>\ntype=file\nlength=8\nFor missing path: exists=false",
    ["Check existence before reporting length.", "Use Files.isReadable / isWritable.", "Never assume permissions are identical across machines."]),
  "java-lab-15": desktop(
    "Using a faculty-provided JDBC driver and test database, create Student(id,name). Add (1,'Asha'), retrieve it, modify the name to 'Asha R', retrieve again, delete id 1 and report the remaining row count. Use PreparedStatement, try-with-resources and transaction rollback on error. Submit source and results; never include passwords in source.",
    "1 Asha\n1 Asha R\nRemaining rows: 0",
    ["Get connection settings from environment variables.", "Use parameters instead of concatenating SQL.", "Commit only after all intended operations succeed."]),
  "java-lab-16": desktop(
    "Build a desktop traffic-light simulator with grouped Red, Yellow and Green radio buttons. Initially show no message. Selecting a color shows STOP, READY or GO above the buttons in that color. Submit source and an observation for each selection.",
    "Initial: no message\nRed: STOP (red)\nYellow: READY (yellow)\nGreen: GO (green)",
    ["Use ButtonGroup for mutual exclusion.", "Update the same label in each listener."]),
  "java-lab-17": desktop(
    "Create a window showing mouse event names at its center. Use MouseAdapter for clicked, pressed, released, entered and exited, and a mouse-motion listener/adapter for moved and dragged. Submit source and observed event sequences.",
    "Center label displays the latest event: entered, moved, pressed, dragged, released, clicked or exited, as applicable.",
    ["Register both mouse and mouse-motion listeners.", "Use a centered label instead of fixed pixel coordinates."]),
  "java-lab-18": desktop(
    "Create a focused text component and display keyPressed, keyReleased and keyTyped details. Test a letter and an arrow key, reporting codes and characters. Submit source and observations.",
    "Typing a produces pressed, typed(a), released events.\nAn arrow key produces pressed and released; it has no printable typed character.",
    ["Ensure the component has keyboard focus.", "Use getKeyChar for typed events and getKeyCode for pressed/released."]),
  "java-lab-19": desktop(
    "Build a GridLayout calculator with digit buttons and +, -, *, %, and division controls, a result field, and a clear button. Handle invalid input and zero divisors. Test 12+3, 9-4, 6*7, 10%3 and 8/0. Submit source and results.",
    "12+3 = 15\n9-4 = 5\n6*7 = 42\n10%3 = 1\n8/0 = error (no crash)",
    ["Separate input state from arithmetic evaluation.", "Check zero for both remainder and division.", "Avoid evaluating arbitrary strings as code."]),
  "java-lab-20": desktop(
    "Implement the syllabus's legacy message applet displaying 'Welcome to Java'. Include its lifecycle methods and explain when init, start, stop and destroy occur. Submit source and lifecycle notes. Use only an institution-managed legacy appletviewer environment for demonstration, not a modern web browser.",
    "The applet drawing area displays: Welcome to Java\nLifecycle notes cover init, start, stop and destroy.",
    ["Render the text in paint(Graphics).", "An applet has no main entry point.", "Applets are legacy technology; no browser execution is provided."]),
  "java-lab-21": desktop(
    "Implement the legacy factorial applet with integer input, Compute button and read-only result. Accept 0..20 using long; reject negative, non-numeric and larger inputs. Test 0, 5 and -1. Submit source and observations from an institution-managed legacy environment, or a documented Swing adaptation approved by faculty.",
    "0 -> 1\n5 -> 120\n-1 -> validation error",
    ["Initialize the product to 1.", "Validate before starting the factorial loop.", "21! exceeds the signed long range."]),
};

const mcq = (id, prompt, options, correctIndex) => ({ id, prompt, options, correctIndex, marks: 1 });
activityTemplates["java-lab-20"].starterCode = "import java.applet.Applet;\nimport java.awt.Graphics;\n\npublic class Main extends Applet {\n  public void init() {\n    // Initialize the legacy applet.\n  }\n  public void paint(Graphics g) {\n    // Draw the required message.\n  }\n}\n";
activityTemplates["java-lab-21"].starterCode = "import java.applet.Applet;\nimport java.awt.*;\nimport java.awt.event.*;\n\npublic class Main extends Applet implements ActionListener {\n  public void init() {\n    // Create the input, result field and Compute button.\n  }\n  public void actionPerformed(ActionEvent event) {\n    // Validate input and calculate factorial.\n  }\n}\n";
const theory = [
  ["java-theory-1", java("Read n and compute n! using a recursive method for 0<=n<=12. Print the result. Sample input 5.", "120", ["The base case is factorial(0)=1.", "Return n*factorial(n-1)."], { input: "5" }),
    ["Which feature hides an object's internal state?", ["Encapsulation", "Compilation", "Iteration", "Importing"], 0],
    ["Which is true of a Java constructor?", ["It must return void", "It has the class name and no return type", "It cannot be overloaded", "It is inherited"], 1]],
  ["java-theory-2", java("Create interface Printable with print(). Implement it in Report to print 'Report ready'. Invoke print through an interface reference.", "Report ready", ["Use implements on the concrete class.", "The implemented method must be public."]),
    ["Which keyword accesses a superclass implementation?", ["this", "final", "super", "package"], 2],
    ["An interface field is implicitly:", ["private and mutable", "protected only", "transient", "public static final"], 3]],
  ["java-theory-3", java("Read two integers and divide them. Print the integer quotient; on a zero divisor catch ArithmeticException and print 'Cannot divide by zero'.", "Cannot divide by zero", ["Place the division inside try.", "Catch ArithmeticException rather than swallowing every error."], { input: "12 0" }),
    ["Which method releases the monitor while waiting?", ["sleep()", "wait()", "yield()", "join() on any unrelated object"], 1],
    ["What does a generic type primarily improve?", ["Compile-time type safety", "CPU clock speed", "Number of threads", "File permissions"], 0]],
  ["java-theory-4", java("Implement ActionListener in Counter. Its actionPerformed increments an integer count. In main, invoke the handler twice with ActionEvent instances, then print the count. No window is needed.", "2", ["Use java.awt.event.ActionListener.", "Keep the counter in an instance field."]),
    ["Which listener handles a button action?", ["MouseMotionListener", "WindowListener", "ActionListener", "KeyListener"], 2],
    ["Which layout gives components equal-size grid cells?", ["BorderLayout", "GridLayout", "CardLayout", "FlowLayout"], 1]],
  ["java-theory-5", java("Create a javax.swing.table.DefaultTableModel with columns Roll and Name and rows (101,'Asha'), (102,'Bala'), without displaying a window. Print row count then the second student's name.", "2\nBala", ["Model rows are zero-indexed.", "Use getRowCount() and getValueAt(row,column)."]),
    ["Which Swing component displays tabular data?", ["JTree", "JLabel", "JButton", "JTable"], 3],
    ["Which legacy applet callback performs initial setup?", ["init()", "stop()", "destroy()", "main()"], 0]],
  ["dbms-theory-1", make("Create Student(roll_no integer primary key, name varchar(60)). Insert (101,'Asha'),(102,'Bala'). Retrieve the student with roll_no=101. Explain how a primary key represents entity identity in a SQL comment.", "roll_no | name\n101 | Asha", ["A primary key must be unique and non-null.", "Filter using WHERE roll_no=101."]),
    ["Which abstraction level describes physical storage?", ["External", "Conceptual", "Internal", "View"], 2],
    ["An attribute that uniquely identifies an entity is a:", ["Key", "Relationship", "View", "Transaction"], 0]],
  ["dbms-theory-2", make("Create Student(id integer, name varchar(60), department varchar(3)) with (1,'Asha','CSE'),(2,'Bala','CSM'). Express selection of CSE students followed by projection of name in SQL. Include the corresponding relational-algebra operations in a comment.", "name\nAsha", ["Selection corresponds to WHERE.", "Projection corresponds to choosing columns."]),
    ["Relational selection primarily chooses:", ["Columns", "Rows", "Indexes", "Schemas"], 1],
    ["A foreign key enforces:", ["Sort order", "Encryption", "Referential integrity", "Compression"], 2]],
  ["dbms-theory-3", make("Create Scores(dept varchar(3), marks integer) with ('CSE',70),('CSE',90),('CSM',50). Show departments whose average marks exceed 60, in department order.", "dept | average\nCSE | 80", ["Group by dept.", "Use HAVING AVG(marks)>60."]),
    ["Which clause filters aggregate groups?", ["ORDER BY", "WHERE", "SELECT", "HAVING"], 3],
    ["In BCNF, every nontrivial functional dependency has:", ["A superkey determinant", "A NULL determinant", "Only one attribute", "No candidate keys"], 0]],
  ["dbms-theory-4", make("Create Account(id integer primary key, balance integer) with (1,100),(2,50). Begin a transaction, subtract 20 from account 1, add 20 to account 2, then ROLLBACK. Query balances ordered by id. Run all statements in one isolated database session.", "id | balance\n1 | 100\n2 | 50", ["Rollback reverses uncommitted changes.", "Create the fixture before starting the transfer transaction."]),
    ["Which ACID property means all-or-nothing?", ["Isolation", "Atomicity", "Durability", "Consistency"], 1],
    ["A conflict-serializable schedule has a precedence graph that is:", ["Complete", "Cyclic", "Acyclic", "Undirected"], 2]],
  ["dbms-theory-5", make("Create Student(id integer primary key, marks integer) with (1,60),(2,80),(3,90). Create an index on marks. Query ids with marks>=80 ordered by id. Include a comment explaining why the optimizer may still choose a table scan on this tiny fixture.", "id\n2\n3", ["An index does not change logical query results.", "Use CREATE INDEX ... ON Student(marks)."]),
    ["Which index generally supports ordered range scans?", ["Unordered hash only", "B+ tree", "Random file", "Heap without an index"], 1],
    ["Compared with static ISAM, a B+ tree:", ["Never splits pages", "Cannot be searched", "Stores no keys", "Dynamically splits and merges nodes"], 3]],
];

for (const [id, template, ...questions] of theory) {
  activityTemplates[id] = {
    ...template,
    questions: questions.map(([prompt, options, correctIndex], i) => mcq(id + "-q" + (i + 1), prompt, options, correctIndex)),
  };
}
