-- since prisma provides the cuid() function (not supported by sqlite), we use prisma statements instead of sql to create users
--insert into user(id, username, email) values (100, "user100", "user100@test.com");
--insert into user(id, username, email) values (101, "user101", "user101@test.com");

insert into tag(id, tag) values (0, 'global');


insert into post(id, parent_id, author_id, content) values (1, null, 100, 'So, pregnant people can’t cross state lines to get abortions but guys like Kyle Rittenhouse can cross state lines to murder people. Seems fair.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, null, 100, 1);
insert into post(id, parent_id, author_id, content) values (2, 1, 101, 'Kyle Rittenhouse was acquitted of murder charges. Clear video evidence showed he acted in self defense.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 2, null, 101, 1);
insert into post(id, parent_id, author_id, content) values (3, 2, 100, 'That trial was a sham. They were never going to convict.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 3, null, 100, 1);


insert into post(id, parent_id, author_id, content) values (4, null, 100, 'Sudafed, Benadryl and most decongestants don’t work: FDA advisory panel https://trib.al/sJmOJBP');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 4, null, 100, 1);
insert into post(id, parent_id, author_id, content) values (5, 4, 100, 'This is misleading. Regular Benadryl is an antihistamine; it is not a decongestant. There is a Benadryl branded product that is impacted. https://www.nbcnews.com/news/amp/rcna104424');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 5, null, 101, 1);

insert into post(id, parent_id, author_id, content) values (6, null, 100, 'Right now, real wages for the average American worker is higher than it was before the pandemic, with lower wage workers seeing the largest gains. That''s Bidenomics.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 6, null, 100, 1);
insert into post(id, parent_id, author_id, content) values (7, 6, 100, 'The tweet’s claim about real wages contains a factual error. On 3/15/20 when US COVID lockdowns began real wages adjusted for inflation (AFI) were $11.15. As of 7/16/23 real wages AFI are $11.05. Real wages AFI remain lower (not higher) than before the pandemic.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 7, null, 101, 1);




insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 2, 3, 100, 1);  --agreed with 2 (shown 3)
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 100, -1); --changed mind after seeing 2
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 100, 1);  --changed mind back (for no reason)
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 100, -1); --changed mind again (for no reason)



insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 101, -1);

insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 2, 3, 101, -1);
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 2, 3, 101, 1);
