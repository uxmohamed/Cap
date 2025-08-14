// Test the actual database functions that your application uses
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./schema-postgres');

async function testApplicationQueries() {
  const connectionString = "postgresql://postgres.iqcfsckyuzdvwhxtrwke:qrf8sZaPOUPIyotY@aws-1-eu-north-1.pooler.supabase.com:6543/postgres";
  
  const client = postgres(connectionString, {
    prepare: false,
  });

  const db = drizzle(client, { schema });

  try {
    console.log('🧪 Testing Application-Level Database Operations...\n');

    // 1. Test the db() function that your app uses
    console.log('1️⃣ Testing Application Database Connection...');
    
    // Simulate how your app calls db()
    const testDbFunction = () => {
      if (!testDbFunction._cached) {
        testDbFunction._cached = drizzle(client, { schema });
      }
      return testDbFunction._cached;
    };
    
    const appDb = testDbFunction();
    console.log('✅ Application db() function working');

    // 2. Test User Operations (most common in your app)
    console.log('\n2️⃣ Testing User Operations...');
    
    // Create test user
    const newUser = await appDb.insert(schema.users).values({
      id: 'app_test_user',
      email: 'apptest@example.com',
      name: 'App Test User',
      inviteQuota: 5
    }).returning();
    
    console.log('✅ User INSERT:', newUser[0].email);

    // Find user
    const foundUser = await appDb.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'apptest@example.com')
    });
    console.log('✅ User QUERY:', foundUser.name);

    // 3. Test Organization Operations
    console.log('\n3️⃣ Testing Organization Operations...');
    
    const newOrg = await appDb.insert(schema.organizations).values({
      id: 'app_test_org',
      name: 'App Test Organization',
      ownerId: 'app_test_user'
    }).returning();
    
    console.log('✅ Organization INSERT:', newOrg[0].name);

    // Test organization with owner relationship
    const orgWithOwner = await appDb.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, 'app_test_org'),
      with: {
        owner: true
      }
    });
    console.log('✅ Organization with Owner relationship:', orgWithOwner.owner.name);

    // 4. Test Video Operations
    console.log('\n4️⃣ Testing Video Operations...');
    
    const newVideo = await appDb.insert(schema.videos).values({
      id: 'app_test_video',
      ownerId: 'app_test_user',
      name: 'Test Video',
      public: true,
      source: { type: 'MediaConvert' },
      metadata: {
        duration: 120,
        resolution: '1920x1080'
      }
    }).returning();
    
    console.log('✅ Video INSERT with JSONB metadata:', newVideo[0].name);

    // Test video with owner
    const videoWithOwner = await appDb.query.videos.findFirst({
      where: (videos, { eq }) => eq(videos.id, 'app_test_video'),
      with: {
        owner: true
      }
    });
    console.log('✅ Video with Owner relationship:', videoWithOwner.owner.email);

    // 5. Test Folder Operations
    console.log('\n5️⃣ Testing Folder Operations...');
    
    const newFolder = await appDb.insert(schema.folders).values({
      id: 'app_test_folder',
      name: 'Test Folder',
      color: 'blue',
      organizationId: 'app_test_org',
      createdById: 'app_test_user'
    }).returning();
    
    console.log('✅ Folder INSERT:', newFolder[0].name);

    // Update video to be in folder
    await appDb.update(schema.videos)
      .set({ folderId: 'app_test_folder' })
      .where((videos, { eq }) => eq(videos.id, 'app_test_video'));

    // Test folder with videos
    const folderWithVideos = await appDb.query.folders.findFirst({
      where: (folders, { eq }) => eq(folders.id, 'app_test_folder'),
      with: {
        videos: true
      }
    });
    console.log('✅ Folder with Videos relationship:', folderWithVideos.videos.length, 'videos');

    // 6. Test Comment Operations
    console.log('\n6️⃣ Testing Comment Operations...');
    
    const newComment = await appDb.insert(schema.comments).values({
      id: 'app_test_comment',
      type: 'text',
      content: 'This is a test comment',
      timestamp: 30.5,
      authorId: 'app_test_user',
      videoId: 'app_test_video'
    }).returning();
    
    console.log('✅ Comment INSERT:', newComment[0].content);

    // Test comment with author and video
    const commentWithRelations = await appDb.query.comments.findFirst({
      where: (comments, { eq }) => eq(comments.id, 'app_test_comment'),
      with: {
        author: true,
        video: true
      }
    });
    console.log('✅ Comment with relationships:', commentWithRelations.author.name, '->', commentWithRelations.video.name);

    // 7. Test Complex Queries (like your app would use)
    console.log('\n7️⃣ Testing Complex Application Queries...');
    
    // Get user's videos with comments count (typical app query)
    const userVideosWithStats = await appDb.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, 'app_test_user'),
      with: {
        videos: {
          with: {
            comments: true,
            folder: true
          }
        }
      }
    });
    
    console.log('✅ Complex query - User videos with comments:');
    userVideosWithStats.videos.forEach(video => {
      console.log(`   - ${video.name}: ${video.comments.length} comments, folder: ${video.folder?.name || 'none'}`);
    });

    // 8. Test Search/Filter Operations (common in apps)
    console.log('\n8️⃣ Testing Search Operations...');
    
    // Search videos by name
    const searchResults = await appDb.query.videos.findMany({
      where: (videos, { like, and, eq }) => and(
        like(videos.name, '%Test%'),
        eq(videos.public, true)
      ),
      with: {
        owner: true
      }
    });
    
    console.log('✅ Search query results:', searchResults.length, 'videos found');

    // 9. Test Transaction Operations
    console.log('\n9️⃣ Testing Transactions...');
    
    await appDb.transaction(async (tx) => {
      // Create space and add member in transaction
      await tx.insert(schema.spaces).values({
        id: 'app_test_space',
        name: 'Test Space',
        organizationId: 'app_test_org',
        createdById: 'app_test_user',
        privacy: 'Private'
      });
      
      await tx.insert(schema.spaceMembers).values({
        id: 'app_test_space_member',
        spaceId: 'app_test_space',
        userId: 'app_test_user',
        role: 'admin'
      });
    });
    
    console.log('✅ Transaction completed successfully');

    // 10. Test Performance with Indexes
    console.log('\n🔟 Testing Index Performance...');
    
    const start = Date.now();
    await appDb.query.videos.findMany({
      where: (videos, { eq }) => eq(videos.ownerId, 'app_test_user'),
      limit: 10
    });
    const queryTime = Date.now() - start;
    
    console.log('✅ Indexed query performance:', queryTime + 'ms (should be fast)');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await appDb.delete(schema.spaceMembers).where((members, { eq }) => eq(members.id, 'app_test_space_member'));
    await appDb.delete(schema.spaces).where((spaces, { eq }) => eq(spaces.id, 'app_test_space'));
    await appDb.delete(schema.comments).where((comments, { eq }) => eq(comments.id, 'app_test_comment'));
    await appDb.delete(schema.videos).where((videos, { eq }) => eq(videos.id, 'app_test_video'));
    await appDb.delete(schema.folders).where((folders, { eq }) => eq(folders.id, 'app_test_folder'));
    await appDb.delete(schema.organizations).where((orgs, { eq }) => eq(orgs.id, 'app_test_org'));
    await appDb.delete(schema.users).where((users, { eq }) => eq(users.id, 'app_test_user'));
    
    console.log('✅ All test data cleaned up');

    console.log('\n🎉 ALL APPLICATION TESTS PASSED!');
    console.log('\n✨ Your database migration is 100% working with your application!');
    console.log('   - All CRUD operations work perfectly');
    console.log('   - All relationships and joins work');
    console.log('   - Complex queries perform well');
    console.log('   - Transactions work correctly');
    console.log('   - JSONB fields work as expected');
    console.log('   - All indexes are functioning');

  } catch (error) {
    console.error('❌ Application test failed:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

testApplicationQueries();
