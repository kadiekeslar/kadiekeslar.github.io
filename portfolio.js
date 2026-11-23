const lifeContent = {
      family: {
        title: "Family",
        meta: "My biggest support system",
        text: "My family has always inspired me to follow my dreams and shown me what hard work, support, and perseverance can make possible. I would not be where I am without the way they have encouraged me, believed in me, and pushed me to keep going. I feel beyond blessed to have a family that supports me so deeply, and so much of who I am and what I hope to become comes from them.",
        photo: "family.jpg",
        alt: "Kadie with her family",
        fallback: "add family.jpg",
        position: "center center"
      },
      volunteer: {
        title: "Volunteer",
        meta: "Mission Four18 · Jamaica",
        text: "I’ve had the opportunity to serve with Mission Four18 in Jamaica, working alongside local communities in Clarendon Parish and helping wherever I can. Their work supports people through areas such as education, construction, healthcare, and other practical community needs. Each time I go, my hope is to show up with care, serve wherever I’m needed, and leave even one person feeling seen, supported, or encouraged. The people I’ve met have impacted me just as much as I could ever hope to impact them, and the experience continually reminds me how meaningful it is to give your time and heart to others.",
        photo: "mission-four18.jpg",
        alt: "Kadie volunteering with Mission Four18 in Jamaica",
        fallback: "add mission-four18.jpg",
        link: "https://www.missionfour18.org/",
        linkLabel: "Learn about Mission Four18",
        position: "center center"
      },
      alpha: {
        title: "Alpha Phi",
        meta: "Director of Primary Panhellenic Recruitment",
        text: "As Director of Primary Panhellenic Recruitment for Alpha Phi, I help plan and shape our chapter’s primary recruitment experience with the goal of making every potential new member feel welcomed, comfortable, and excited to learn who we are. This role has given me a meaningful opportunity to grow as a leader, collaborate closely with the women in my chapter, and help create an experience that represents something incredibly special to all of us.",
        photo: "alpha-phi.jpg",
        alt: "Kadie with members of Alpha Phi",
        fallback: "add alpha-phi.jpg",
        position: "center 65%"
      },
      experience: {
        title: "Research Experience",
        meta: "Research Assistant · Lumilo Project · Summer 2026 — Present",
        text: "I’m currently a Research Assistant on the Lumilo Project, where I help design and prototype a recommender system for a project that uses mixed-reality smart glasses to provide teachers with real-time insights and recommendations about student learning. The goal is to help teachers better understand what is happening in the classroom and support students more effectively. This experience has given me the opportunity to combine research, human-computer interaction, prototyping, and AI while learning from Dr. Vincent Aleven and contributing to technology designed around real classroom needs.",
        photo: "lumilo.jpg",
        alt: "Kadie working on the Lumilo research project",
        fallback: "add lumilo.jpg",
        link: "https://www.hcii.cmu.edu/hcii-impacts/teacher-ai-collaboration",
        linkLabel: "Learn more about Lumilo",
        position: "center center"
      }
    };
const pages = [...document.querySelectorAll('[data-page]')];
const navLinks = [...document.querySelectorAll('header nav a')];
function showPage() {
 const hash = location.hash.slice(1) || 'overview';
 const target = document.getElementById(hash);
 const name = target?.closest('[data-page]')?.dataset.page || (pages.some(p=>p.dataset.page===hash) ? hash : ({top:'overview',about:'present',values:'present',outside:'past',contact:'overview'}[hash] || 'overview'));
 pages.forEach(page=>{page.hidden=page.dataset.page!==name;});
 navLinks.forEach(link=>{if(link.hash==='#'+name) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');});
 document.body.classList.toggle('on-overview',name==='overview');
 document.title = 'Kadie Keslar | '+name.charAt(0).toUpperCase()+name.slice(1);
 if(target && !target.hidden) target.scrollIntoView(); else window.scrollTo(0,0);
}
window.addEventListener('hashchange',showPage);
function story(item) {
 const section=document.createElement('article'); section.className='life-story';
 const image=document.createElement('img'); image.src=item.photo; image.alt=item.alt; image.loading='lazy'; image.style.objectPosition=item.position;
 const copy=document.createElement('div');
 const meta=document.createElement('p'); meta.className='eyebrow'; meta.textContent=item.meta;
 const heading=document.createElement('h2'); heading.textContent=item.title;
 const text=document.createElement('p'); text.textContent=item.text;
 copy.append(meta,heading,text);
 if(item.link) {const link=document.createElement('a'); link.href=item.link; link.textContent=item.linkLabel; link.target='_blank'; link.rel='noreferrer'; copy.append(link);}
 section.append(image,copy); return section;
}
document.getElementById('research-content').append(story(lifeContent.experience));
['family','volunteer','alpha'].forEach(key=>document.getElementById('life-stories').append(story(lifeContent[key])));
function clock(){ document.getElementById('clock').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(new Date()); }
clock(); setInterval(clock,60000); document.getElementById('year').textContent=new Date().getFullYear(); showPage();
