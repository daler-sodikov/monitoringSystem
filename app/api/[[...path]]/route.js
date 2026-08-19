import { getDb } from '@/lib/mongodb';
import { createToken, getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

async function handleSignup(request) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return Response.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      role: role || 'STUDENT',
      createdAt: new Date()
    });

    // Create token
    const token = await createToken({ userId: result.insertedId.toString(), role: role || 'STUDENT' });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return Response.json({
      success: true,
      user: {
        _id: result.insertedId,
        name,
        email,
        role: role || 'STUDENT'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleLogin(request) {
  try {
    const { email, password, name, roomId } = await request.json();

    const db = await getDb();

    // Student room login (name only)
    if (roomId && name && !email && !password) {
      // Check if student with this name already exists for this room
      let user = await db.collection('users').findOne({ name, role: 'STUDENT' });

      if (!user) {
        // Create new student
        const result = await db.collection('users').insertOne({
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@student.local`,
          password: await hashPassword(Math.random().toString(36)),
          role: 'STUDENT',
          createdAt: new Date()
        });
        user = { _id: result.insertedId, name, role: 'STUDENT' };
      }

      // Create token
      const token = await createToken({ userId: user._id.toString(), role: 'STUDENT' });

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      return Response.json({ success: true, user: { _id: user._id, name: user.name, role: 'STUDENT' } });
    }

    // Regular login
    if (!email || !password) {
      return Response.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create token
    const token = await createToken({ userId: user._id.toString(), role: user.role });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return Response.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleLogout() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  return Response.json({ success: true });
}

async function handleMe() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return Response.json({ user });
}

// ============================================
// TEST ROUTES (TEACHER ONLY)
// ============================================

async function handleGetTests() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const tests = await db.collection('tests')
    .find({ teacherId: user._id.toString() })
    .sort({ createdAt: -1 })
    .toArray();

  return Response.json({ tests });
}

async function handleCreateTest(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'TEACHER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, description, variants } = await request.json();

    if (!title || !variants || variants.length === 0) {
      return Response.json({ error: 'Title and at least one variant required' }, { status: 400 });
    }

    const db = await getDb();

    // Create test
    const testResult = await db.collection('tests').insertOne({
      title,
      description: description || '',
      teacherId: user._id.toString(),
      createdAt: new Date()
    });

    const testId = testResult.insertedId.toString();

    // Create variants with questions
    for (const variant of variants) {
      const variantResult = await db.collection('variants').insertOne({
        testId,
        name: variant.name || 'Variant',
        createdAt: new Date()
      });

      const variantId = variantResult.insertedId.toString();

      // Create questions for this variant
      if (variant.questions && variant.questions.length > 0) {
        for (let i = 0; i < variant.questions.length; i++) {
          const q = variant.questions[i];
          const questionResult = await db.collection('questions').insertOne({
            variantId,
            text: q.text,
            type: q.type,
            order: i + 1,
            points: q.points || 1,
            createdAt: new Date()
          });

          const questionId = questionResult.insertedId.toString();

          // Create options for MULTIPLE_CHOICE
          if (q.type === 'MULTIPLE_CHOICE' && q.options) {
            for (const opt of q.options) {
              await db.collection('options').insertOne({
                questionId,
                text: opt.text,
                isCorrect: opt.isCorrect || false
              });
            }
          }

          // Create matching pairs for MATCHING
          if (q.type === 'MATCHING' && q.pairs) {
            for (const pair of q.pairs) {
              await db.collection('matchingpairs').insertOne({
                questionId,
                left: pair.left,
                right: pair.right
              });
            }
          }
        }
      }
    }

    return Response.json({ success: true, testId });
  } catch (error) {
    console.error('Create test error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGetTest(request, testId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'TEACHER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const test = await db.collection('tests').findOne({ _id: new ObjectId(testId) });

  if (!test) {
    return Response.json({ error: 'Test not found' }, { status: 404 });
  }

  if (test.teacherId !== user._id.toString()) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get variants
  const variants = await db.collection('variants')
    .find({ testId: testId })
    .toArray();

  // Get questions for each variant
  for (const variant of variants) {
    const questions = await db.collection('questions')
      .find({ variantId: variant._id.toString() })
      .sort({ order: 1 })
      .toArray();

    // Get options and pairs for each question
    for (const question of questions) {
      if (question.type === 'MULTIPLE_CHOICE') {
        question.options = await db.collection('options')
          .find({ questionId: question._id.toString() })
          .toArray();
      } else if (question.type === 'MATCHING') {
        question.pairs = await db.collection('matchingpairs')
          .find({ questionId: question._id.toString() })
          .toArray();
      }
    }

    variant.questions = questions;
  }

  test.variants = variants;

  return Response.json({ test });
}

async function handleDeleteTest(request, testId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'TEACHER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const test = await db.collection('tests').findOne({ _id: new ObjectId(testId) });

  if (!test) {
    return Response.json({ error: 'Test not found' }, { status: 404 });
  }

  if (test.teacherId !== user._id.toString()) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete test and all related data
  const variants = await db.collection('variants').find({ testId }).toArray();

  for (const variant of variants) {
    const variantId = variant._id.toString();
    const questions = await db.collection('questions').find({ variantId }).toArray();

    for (const question of questions) {
      const questionId = question._id.toString();
      await db.collection('options').deleteMany({ questionId });
      await db.collection('matchingpairs').deleteMany({ questionId });
    }

    await db.collection('questions').deleteMany({ variantId });
  }

  await db.collection('variants').deleteMany({ testId });
  await db.collection('tests').deleteOne({ _id: new ObjectId(testId) });

  return Response.json({ success: true });
}

// ============================================
// ROOM ROUTES
// ============================================

async function handleGetRooms() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'TEACHER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const rooms = await db.collection('rooms')
    .find({ teacherId: user._id.toString() })
    .sort({ createdAt: -1 })
    .toArray();

  // Get test details for each room
  for (const room of rooms) {
    room.test = await db.collection('tests').findOne({ _id: new ObjectId(room.testId) });

    // Count students
    room.studentCount = await db.collection('roomstudents').countDocuments({ roomId: room._id.toString() });
  }

  return Response.json({ rooms });
}

async function generateUniqueRoomCode(db) {
  let code;
  let attempts = 0;
  do {
    // Generate random 3-digit number (100-999)
    code = String(Math.floor(100 + Math.random() * 900));
    const existing = await db.collection('rooms').findOne({ code });
    if (!existing) break;
    attempts++;
  } while (attempts < 50);
  return code;
}

async function handleCreateRoom(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'TEACHER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { testId, name } = await request.json();

    if (!testId || !name) {
      return Response.json({ error: 'Test ID and name required' }, { status: 400 });
    }

    const db = await getDb();

    // Verify test belongs to teacher
    const test = await db.collection('tests').findOne({ _id: new ObjectId(testId) });
    if (!test || test.teacherId !== user._id.toString()) {
      return Response.json({ error: 'Test not found or forbidden' }, { status: 403 });
    }

    // Generate unique 3-digit room code
    const code = await generateUniqueRoomCode(db);

    await db.collection('rooms').insertOne({
      code,
      testId,
      name,
      status: 'OPEN',
      teacherId: user._id.toString(),
      createdAt: new Date(),
      closedAt: null
    });

    return Response.json({ success: true, roomId: code });
  } catch (error) {
    console.error('Create room error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGetRoom(request, roomId) {
  try {
    const db = await getDb();
    const room = await db.collection('rooms').findOne({ code: roomId });

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get test details
    room.test = await db.collection('tests').findOne({ _id: new ObjectId(room.testId) });

    return Response.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleJoinRoom(request, roomId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'STUDENT') {
    return Response.json({ error: 'Only students can join rooms' }, { status: 403 });
  }

  try {
    const db = await getDb();
    const room = await db.collection('rooms').findOne({ code: roomId });

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'OPEN') {
      return Response.json({ error: 'Room is closed' }, { status: 400 });
    }

    // Check if student already joined
    const existing = await db.collection('roomstudents').findOne({
      roomId: roomId,
      studentId: user._id.toString()
    });

    if (existing) {
      // Return existing assignment
      return Response.json({
        success: true,
        roomStudent: existing,
        alreadyJoined: true
      });
    }

    // Get all variants for this test
    const variants = await db.collection('variants')
      .find({ testId: room.testId })
      .toArray();

    if (variants.length === 0) {
      return Response.json({ error: 'No variants available' }, { status: 400 });
    }

    // Assign random variant
    const randomVariant = variants[Math.floor(Math.random() * variants.length)];

    // Create room student record
    const result = await db.collection('roomstudents').insertOne({
      roomId: roomId,
      studentId: user._id.toString(),
      assignedVariantId: randomVariant._id.toString(),
      submittedAt: null,
      score: null,
      createdAt: new Date()
    });

    return Response.json({
      success: true,
      roomStudent: {
        _id: result.insertedId,
        roomId,
        studentId: user._id.toString(),
        assignedVariantId: randomVariant._id.toString(),
        submittedAt: null,
        score: null
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGetRoomQuestions(request, roomId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'STUDENT') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Get room student record
    const roomStudent = await db.collection('roomstudents').findOne({
      roomId: roomId,
      studentId: user._id.toString()
    });

    if (!roomStudent) {
      return Response.json({ error: 'Not joined this room' }, { status: 400 });
    }

    // Get questions for assigned variant
    const questions = await db.collection('questions')
      .find({ variantId: roomStudent.assignedVariantId })
      .sort({ order: 1 })
      .toArray();

    // Get options/pairs for each question
    for (const question of questions) {
      if (question.type === 'MULTIPLE_CHOICE') {
        const options = await db.collection('options')
          .find({ questionId: question._id.toString() })
          .toArray();
        // Don't send isCorrect to students
        question.options = options.map(opt => ({
          _id: opt._id,
          text: opt.text
        }));
      } else if (question.type === 'MATCHING') {
        const pairs = await db.collection('matchingpairs')
          .find({ questionId: question._id.toString() })
          .toArray();
        // Shuffle for matching questions
        const lefts = pairs.map(p => ({ id: p._id.toString(), text: p.left }));
        const rights = pairs.map(p => ({ id: p._id.toString(), text: p.right })).sort(() => Math.random() - 0.5);
        question.lefts = lefts;
        question.rights = rights;
      }
    }

    // Get existing answers if any
    const answers = await db.collection('answers')
      .find({ roomStudentId: roomStudent._id.toString() })
      .toArray();

    return Response.json({
      questions,
      answers,
      roomStudent
    });
  } catch (error) {
    console.error('Get room questions error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleSubmitAnswers(request, roomId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'STUDENT') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { answers } = await request.json();

    const db = await getDb();

    // Get room
    const room = await db.collection('rooms').findOne({ code: roomId });
    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'CLOSED') {
      return Response.json({ error: 'Room is closed, cannot submit' }, { status: 400 });
    }

    // Get room student record
    const roomStudent = await db.collection('roomstudents').findOne({
      roomId: roomId,
      studentId: user._id.toString()
    });

    if (!roomStudent) {
      return Response.json({ error: 'Not joined this room' }, { status: 400 });
    }

    // Delete existing answers
    await db.collection('answers').deleteMany({
      roomStudentId: roomStudent._id.toString()
    });

    // Insert new answers
    for (const ans of answers) {
      await db.collection('answers').insertOne({
        roomStudentId: roomStudent._id.toString(),
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect: null, // Will be calculated when room closes
        createdAt: new Date()
      });
    }

    // Update submitted timestamp
    await db.collection('roomstudents').updateOne(
      { _id: roomStudent._id },
      { $set: { submittedAt: new Date() } }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Submit answers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCloseRoom(request, roomId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'TEACHER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const room = await db.collection('rooms').findOne({ code: roomId });

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.teacherId !== user._id.toString()) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (room.status === 'CLOSED') {
      return Response.json({ error: 'Room already closed' }, { status: 400 });
    }

    // Close the room
    await db.collection('rooms').updateOne(
      { code: roomId },
      { $set: { status: 'CLOSED', closedAt: new Date() } }
    );

    // Auto-check answers and calculate results
    const roomStudents = await db.collection('roomstudents')
      .find({ roomId: roomId })
      .toArray();

    for (const roomStudent of roomStudents) {
      let totalScore = 0;
      let totalPoints = 0;

      // Get all questions for this variant
      const questions = await db.collection('questions')
        .find({ variantId: roomStudent.assignedVariantId })
        .toArray();

      for (const question of questions) {
        totalPoints += question.points || 1;

        // Get student's answer
        const answer = await db.collection('answers').findOne({
          roomStudentId: roomStudent._id.toString(),
          questionId: question._id.toString()
        });

        if (!answer) continue;

        let isCorrect = false;

        if (question.type === 'MULTIPLE_CHOICE') {
          // Check if selected option is correct
          const selectedOption = await db.collection('options').findOne({
            _id: new ObjectId(answer.answer)
          });
          isCorrect = selectedOption && selectedOption.isCorrect;
        } else if (question.type === 'MATCHING') {
          // Check if all pairs match correctly
          const pairs = await db.collection('matchingpairs')
            .find({ questionId: question._id.toString() })
            .toArray();

          const userPairs = answer.answer; // Array of { leftId, rightId }
          let allCorrect = true;

          for (const pair of pairs) {
            const userPair = userPairs.find(up => up.leftId === pair._id.toString());
            if (!userPair || userPair.rightId !== pair._id.toString()) {
              allCorrect = false;
              break;
            }
          }

          isCorrect = allCorrect;
        }
        // OPEN questions remain unchecked (isCorrect = false by default)

        // Update answer with isCorrect
        await db.collection('answers').updateOne(
          { _id: answer._id },
          { $set: { isCorrect } }
        );

        if (isCorrect) {
          totalScore += question.points || 1;
        }
      }

      // Update room student score
      await db.collection('roomstudents').updateOne(
        { _id: roomStudent._id },
        { $set: { score: totalScore } }
      );

      // Create result record
      const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

      await db.collection('results').insertOne({
        roomId: roomId,
        studentId: roomStudent.studentId,
        roomStudentId: roomStudent._id.toString(),
        score: totalScore,
        totalPoints,
        percentage: Math.round(percentage * 100) / 100,
        createdAt: new Date()
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Close room error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGetRoomResults(request, roomId) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const room = await db.collection('rooms').findOne({ code: roomId });

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    // Teachers can see all results
    if (user.role === 'TEACHER') {
      if (room.teacherId !== user._id.toString()) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const results = await db.collection('results')
        .find({ roomId: roomId })
        .toArray();

      // Get student details
      for (const result of results) {
        result.student = await db.collection('users').findOne(
          { _id: new ObjectId(result.studentId) },
          { projection: { password: 0 } }
        );
      }

      // Донишҷӯёне, ки то пӯшидани ҳуҷра ҷавобҳояшонро супоридаанд
      // (то ҳол натиҷа ҳисоб карда нашудааст, аммо аллакай submit кардаанд)
      const submissions = await db.collection('roomstudents')
        .find({ roomId: roomId, submittedAt: { $ne: null } })
        .sort({ submittedAt: 1 })
        .toArray();

      for (const submission of submissions) {
        submission.student = await db.collection('users').findOne(
          { _id: new ObjectId(submission.studentId) },
          { projection: { password: 0 } }
        );
      }

      return Response.json({ results, submissions, room });
    }

    // Students can only see their own result
    if (user.role === 'STUDENT') {
      const result = await db.collection('results').findOne({
        roomId: roomId,
        studentId: user._id.toString()
      });

      if (!result) {
        return Response.json({ error: 'Result not found' }, { status: 404 });
      }

      return Response.json({ result, room });
    }

    return Response.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Get room results error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGetStudentResult(request, roomId, studentId) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Check if room exists
    const room = await db.collection('rooms').findOne({ code: roomId });
    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get test details
    room.test = await db.collection('tests').findOne({ _id: new ObjectId(room.testId) });

    // Security check
    if (user.role === 'TEACHER' && room.teacherId !== user._id.toString()) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role === 'STUDENT' && user._id.toString() !== studentId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get room student record to find assigned variant
    const roomStudent = await db.collection('roomstudents').findOne({
      roomId: roomId,
      studentId: studentId
    });

    if (!roomStudent) {
      return Response.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Get questions for the assigned variant
    const questions = await db.collection('questions')
      .find({ variantId: roomStudent.assignedVariantId })
      .sort({ order: 1 })
      .toArray();

    // Get options/pairs for each question and student answers
    for (const question of questions) {
      if (question.type === 'MULTIPLE_CHOICE') {
        question.options = await db.collection('options')
          .find({ questionId: question._id.toString() })
          .toArray();
      } else if (question.type === 'MATCHING') {
        question.pairs = await db.collection('matchingpairs')
          .find({ questionId: question._id.toString() })
          .toArray();
      }

      // Find answer for this question
      question.answer = await db.collection('answers').findOne({
        roomStudentId: roomStudent._id.toString(),
        questionId: question._id.toString()
      });
    }

    // Get result summary
    const result = await db.collection('results').findOne({
      roomId: roomId,
      studentId: studentId
    });

    const student = await db.collection('users').findOne(
      { _id: new ObjectId(studentId) },
      { projection: { password: 0 } }
    );

    return Response.json({
      success: true,
      room,
      student,
      result,
      questions
    });
  } catch (error) {
    console.error('Get student result error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// ADMIN ROUTES
// ============================================

async function handleGetTeachers() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const teachers = await db.collection('users')
    .find({ role: 'TEACHER' }, { projection: { password: 0 } })
    .toArray();

  return Response.json({ teachers });
}

async function handleCreateTeacher(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    // Check if user exists
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return Response.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const result = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      role: 'TEACHER',
      createdAt: new Date()
    });

    return Response.json({ success: true, teacherId: result.insertedId });
  } catch (error) {
    console.error('Create teacher error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDeleteTeacher(request, teacherId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  await db.collection('users').deleteOne({ _id: new ObjectId(teacherId) });

  return Response.json({ success: true });
}

// ============================================
// TEACHER GRADING ROUTES
// ============================================

async function handleManualGrade(request, roomId, studentId) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'TEACHER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { questionId, isCorrect } = await request.json();

    const db = await getDb();
    const room = await db.collection('rooms').findOne({ code: roomId });

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.teacherId !== user._id.toString()) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the answer and update isCorrect
    const answer = await db.collection('answers').findOne({
      roomStudentId: studentId,
      questionId: questionId
    });

    if (!answer) {
      return Response.json({ error: 'Answer not found' }, { status: 404 });
    }

    await db.collection('answers').updateOne(
      { _id: answer._id },
      { $set: { isCorrect } }
    );

    // Recalculate score for this student
    const roomStudent = await db.collection('roomstudents').findOne({
      roomId: roomId,
      studentId: studentId
    });

    if (!roomStudent) {
      return Response.json({ error: 'Room student record not found' }, { status: 404 });
    }

    const questions = await db.collection('questions')
      .find({ variantId: roomStudent.assignedVariantId })
      .toArray();

    let totalScore = 0;
    let totalPoints = 0;

    for (const question of questions) {
      totalPoints += question.points || 1;

      const ans = await db.collection('answers').findOne({
        roomStudentId: roomStudent._id.toString(),
        questionId: question._id.toString()
      });

      if (ans && ans.isCorrect) {
        totalScore += question.points || 1;
      }
    }

    // Update room student score
    await db.collection('roomstudents').updateOne(
      { _id: roomStudent._id },
      { $set: { score: totalScore } }
    );

    // Update result record
    const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
    await db.collection('results').updateOne(
      { roomId: roomId, studentId: studentId },
      { $set: { score: totalScore, percentage: Math.round(percentage * 100) / 100 } }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Manual grade error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// MAIN ROUTER
// ============================================

export async function GET(request, { params }) {
  const path = (await params)?.path || [];
  const endpoint = '/' + path.join('/');

  try {
    if (endpoint === '/auth/me') return handleMe(request);
    if (endpoint === '/tests') return handleGetTests(request);
    if (endpoint.match(/^\/tests\/[a-f0-9]{24}$/)) {
      const testId = path[1];
      return handleGetTest(request, testId);
    }
    if (endpoint === '/rooms') return handleGetRooms(request);
    if (endpoint.match(/^\/rooms\/\d{3}$/)) {
      const roomId = path[1];
      return handleGetRoom(request, roomId);
    }
    if (endpoint.match(/^\/rooms\/\d{3}\/questions$/)) {
      const roomId = path[1];
      return handleGetRoomQuestions(request, roomId);
    }
    if (endpoint.match(/^\/rooms\/\d{3}\/results$/)) {
      const roomId = path[1];
      return handleGetRoomResults(request, roomId);
    }
    if (endpoint.match(/^\/rooms\/\d{3}\/results\/[a-f0-9]{24}$/)) {
      const roomId = path[1];
      const studentId = path[3];
      return handleGetStudentResult(request, roomId, studentId);
    }
    if (endpoint === '/teachers') return handleGetTeachers();

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const path = (await params)?.path || [];
  const endpoint = '/' + path.join('/');

  try {
    if (endpoint === '/auth/signup') return handleSignup(request);
    if (endpoint === '/auth/login') return handleLogin(request);
    if (endpoint === '/auth/logout') return handleLogout(request);
    if (endpoint === '/tests') return handleCreateTest(request);
    if (endpoint === '/rooms') return handleCreateRoom(request);
    if (endpoint.match(/^\/rooms\/\d{3}\/join$/)) {
      const roomId = path[1];
      return handleJoinRoom(request, roomId);
    }
    if (endpoint.match(/^\/rooms\/\d{3}\/submit$/)) {
      const roomId = path[1];
      return handleSubmitAnswers(request, roomId);
    }
    if (endpoint.match(/^\/rooms\/\d{3}\/close$/)) {
      const roomId = path[1];
      return handleCloseRoom(request, roomId);
    }
    if (endpoint.match(/^\/rooms\/\d{3}\/grade\/[a-f0-9]{24}$/)) {
      const roomId = path[1];
      const studentId = path[3];
      return handleManualGrade(request, roomId, studentId);
    }
    if (endpoint === '/teachers') return handleCreateTeacher(request);

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const path = (await params)?.path || [];
  const endpoint = '/' + path.join('/');

  try {
    if (endpoint.match(/^\/tests\/[a-f0-9]{24}$/)) {
      const testId = path[1];
      return handleDeleteTest(request, testId);
    }
    if (endpoint.match(/^\/teachers\/[a-f0-9]{24}$/)) {
      const teacherId = path[1];
      return handleDeleteTeacher(request, teacherId);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('DELETE error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
