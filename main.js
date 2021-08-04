var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');

// Server 개체 생성
var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;

    // 기본 목록의 페이지라면
    if(pathname === '/'){
      // 메인 홈이라면
      if(queryData.id === undefined){
        // data 파일의 내용을 불러와 callback함수 실행
        fs.readdir('./data', function(error, filelist){
          var title = 'Welcome';
          var description = 'Hello, Node.js';
          var list = template.list(filelist);
          var html = template.html(title, list,
            `<h2>${title}</h2><p>${description}</p>`,
            // 생성만 다룸
          `<a href="/create">create</a>`);
          response.writeHead(200);
          response.end(html);
        });
      } else {
        // 목록 중 하나라면
        fs.readdir('./data', function(error, filelist){
          var filterdId = path.parse(queryData.id).base;
          fs.readFile(`data/${filterdId}`, 'utf8', function(err, description){
            var title = queryData.id;
            var sanitizeTitle = sanitizeHtml(title);
            var sanitizeDescription = sanitizeHtml(description);
            var list = template.list(filelist);
            var html = template.html(sanitizeTitle, list,
              `<h2>${sanitizeTitle}</h2><p>${sanitizeDescription}</p>`,
              // 생성과 수정을 다룸, 수정 시에 업데이트할 문서 querystring으로 넘겨줌
            `<a href="/create">create</a>
            <a href="/update?id=${sanitizeTitle}">update</a>
            <form action="/delete_process" method="post">
              <input type="hidden" name="id" value="${sanitizeTitle}">
              <input type="submit" value="delete">
            </form>`, '');
            response.writeHead(200);
            response.end(html);
          });
        });
      }
      // 새로운 create 페이지라면
    } else if(pathname === '/create'){
      fs.readdir('./data', function(error, filelist){
        var title = 'create';
        var list = template.list(filelist);
        var html = template.html(title, list,
          `<form action="/create_process" method="post">
            <p><input type="text" name='title' placeholder="title"></p>
            <p><textarea name='description' placeholder="description"></textarea>
            </p>
            <p>
              <input type="submit">
            </p>
          </form>
        `, '');
        response.writeHead(200);
        response.end(html);
      });
      // create 버튼을 누른 후라면
    } else if(pathname === '/create_process'){
      var body = '';
      request.on('data', function(data){
        body = body + data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        var title = post.title;
        var description = post.description;
        fs.writeFile(`data/${title}`, description, 'utf8', function(err){
          // 새로운 내용이 추가됨과 동시에 해당 페이지로 넘어감
          response.writeHead(302, {Location:`/?id=${title}`});
          response.end('success');
        })
      });
      // 이것도 저것도 아니라면
    } else if(pathname === '/update'){
      fs.readdir('./data', function(error, filelist){
        var filterdId = path.parse(queryData.id).base;
        fs.readFile(`data/${filterdId}`, 'utf8', function(err, description){
          var title = queryData.id;
          var list = template.list(filelist);
          // title의 기본값을 value라는 속성을 통해 제목으로 설정해줌
          // title을 이용해 속성값을 부여해주면 제목이 바뀌는 상황에 대처하지 못함
          // 따라서 숨겨진 텍스트로 id라는 속성값을 이용해 제목을 간직해줌
          var html = template.html(title, list,
            `<form action="/update_process" method="post">
            <input type="hidden" name="id" value="${title}">
              <p><input type="text" name='title' placeholder="title" value="${title}"></p>
              <p><textarea name='description' placeholder="description">${description}</textarea>
              </p>
              <p>
                <input type="submit">
              </p>
            </form>`,
          `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`);
          response.writeHead(200);
          response.end(html);
        });
      });
    } else if(pathname === '/update_process'){
      var body = '';
      request.on('data', function(data){
        body = body + data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var title = post.title;
        var description = post.description;

        fs.rename(`data/${id}`, `data/${title}`, function(err){
          fs.writeFile(`data/${title}`, description, 'utf8', function(err){
            response.writeHead(302, {Location:`/?id=${title}`});
            response.end('success');
          });
        });
      });
    } else if(pathname === '/delete_process'){
      var body = '';
      request.on('data', function(data){
        body = body + data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var filterdId = path.parse(id).base;
        fs.unlink(`data/${filterdId}`, function(err){
          response.writeHead(302, {Location:`/`});
          response.end();
        });
      });
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3000);
