// scripts/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function seed() {
  console.log('🌱 Insertando datos de prueba...');
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ── Usuarios ─────────────────────────────────────────────────────────────
  const users = [
    { id: 'user-vol-1',  name: 'María García',       email: 'maria@example.com',          password: hash('Password1'), role: 'volunteer' },
    { id: 'user-vol-2',  name: 'Juan Pérez',          email: 'juan@example.com',           password: hash('Password1'), role: 'volunteer' },
    { id: 'user-vol-3',  name: 'Lucía Fernández',     email: 'lucia@example.com',          password: hash('Password1'), role: 'volunteer' },
    { id: 'user-ngo-1',  name: 'Admin Sustentando',   email: 'admin@sustentando.org',      password: hash('Password1'), role: 'ngo' },
    { id: 'user-ngo-2',  name: 'Admin GreenCba',      email: 'admin@greencba.org',         password: hash('Password1'), role: 'ngo' },
    { id: 'user-ngo-3',  name: 'Admin Banco Alimentos',email: 'admin@bancoalimentos.org',  password: hash('Password1'), role: 'ngo' },
    { id: 'user-ngo-4',  name: 'Admin TechSocial',    email: 'admin@techsocial.org',       password: hash('Password1'), role: 'ngo' },
    { id: 'user-comp-1', name: 'Admin TechCorp',      email: 'admin@techcorp.com',         password: hash('Password1'), role: 'company' },
  ];

  for (const u of users) {
    const exists = await db.get('SELECT id FROM users WHERE id=$1', [u.id]);
    if (!exists) {
      await db.run(
        `INSERT INTO users (id, name, email, password, role, avatar) VALUES ($1,$2,$3,$4,$5,$6)`,
        [u.id, u.name, u.email, u.password, u.role,
         `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`]
      );
    }
  }
  console.log('  ✅ Usuarios');

  // ── ONGs ─────────────────────────────────────────────────────────────────
  const ngos = [
    {
      id: 'ngo-1', user_id: 'user-ngo-1', name: 'Sustentando',
      category: 'Medio Ambiente',
      description: 'Organización dedicada a la reforestación y educación ambiental en Córdoba.',
      mission: 'Reforestar 10.000 hectáreas para 2030.',
      founded: '2015', location: 'Córdoba, Argentina', followers: 1240,
    },
    {
      id: 'ngo-2', user_id: 'user-ngo-2', name: 'Green Córdoba',
      category: 'Medio Ambiente',
      description: 'Conectamos ciudadanos comprometidos con el cuidado del planeta.',
      mission: 'Ciudad más verde, ciudadanos más felices.',
      founded: '2018', location: 'Córdoba, Argentina', followers: 890,
    },
    {
      id: 'ngo-3', user_id: 'user-ngo-3', name: 'Banco de Alimentos Córdoba',
      category: 'Alimentación',
      description: 'Rescatamos alimentos y los distribuimos a familias en situación de vulnerabilidad.',
      mission: 'Cero desperdicio, cero hambre en Córdoba.',
      founded: '2010', location: 'Córdoba, Argentina', followers: 3400,
    },
    {
      id: 'ngo-4', user_id: 'user-ngo-4', name: 'TechSocial',
      category: 'Tecnología',
      description: 'Usamos la tecnología como herramienta de inclusión y educación social.',
      mission: 'Reducir la brecha digital en barrios vulnerables.',
      founded: '2020', location: 'Córdoba, Argentina', followers: 620,
    },
  ];

  for (const n of ngos) {
    const exists = await db.get('SELECT id FROM ngos WHERE id=$1', [n.id]);
    if (!exists) {
      await db.run(
        `INSERT INTO ngos (id, user_id, name, logo, category, description, mission, founded, location, followers)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [n.id, n.user_id, n.name,
         `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(n.name)}`,
         n.category, n.description, n.mission, n.founded, n.location, n.followers]
      );
    }
  }
  console.log('  ✅ ONGs');

  // ── Proyectos ─────────────────────────────────────────────────────────────
  const projects = [
    // ── Fugaces ──────────────────────────────────────────────────────────────
    {
      id: 'proj-1', ngo_id: 'ngo-1',
      title: 'Reforestación Urbana',
      description: 'Ayudanos a plantar 500 árboles nativos en el Parque Sarmiento de Córdoba.',
      full_description: 'El proyecto busca mejorar la calidad del aire y la biodiversidad urbana a través de la plantación de especies nativas. Los voluntarios recibirán capacitación previa y todas las herramientas necesarias. Se plantarán especies como tipa, lapacho y cebil.',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=600&fit=crop',
      category: 'Medio Ambiente', location: 'Parque Sarmiento, Córdoba',
      duration: '2 días (sábado y domingo)', type: 'fugaz', status: 'active',
      volunteers_needed: 50, current_volunteers: 23,
      funding_goal: 15000, current_funding: 8500, cost_per_person: 0,
      roles_needed: JSON.stringify(['Jardinero', 'Coordinador de grupo', 'Fotógrafo']),
      requirements: JSON.stringify(['Ropa cómoda y cerrada', 'Disponibilidad el fin de semana', 'Traer hidratación']),
    },
    {
      id: 'proj-2', ngo_id: 'ngo-2',
      title: 'Limpieza del Río Suquía',
      description: 'Jornada de limpieza y concientización en ambas márgenes del Río Suquía.',
      full_description: 'Un día de acción directa para recuperar las orillas del río más importante de Córdoba. Se realizará clasificación de residuos, limpieza de vegetación invasora y registro fotográfico del estado del ecosistema. Incluye charla de cierre sobre contaminación hídrica.',
      image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&h=600&fit=crop',
      category: 'Medio Ambiente', location: 'Márgenes del Río Suquía, Córdoba',
      duration: '1 día (8hs a 16hs)', type: 'fugaz', status: 'active',
      volunteers_needed: 80, current_volunteers: 67,
      funding_goal: 8000, current_funding: 5600, cost_per_person: 0,
      roles_needed: JSON.stringify(['Limpiador', 'Clasificador de residuos', 'Comunicador ambiental']),
      requirements: JSON.stringify(['Ropa que pueda ensuciarse', 'Guantes (se proveen)', 'Protector solar']),
    },
    {
      id: 'proj-3', ngo_id: 'ngo-3',
      title: 'Maratón Solidaria de Donaciones',
      description: 'Ayudanos a recolectar y clasificar donaciones de alimentos no perecederos en un solo día.',
      full_description: 'Organizamos una jornada masiva de recepción y clasificación de alimentos donados por empresas y particulares. Los voluntarios ayudarán en el traslado, pesaje, clasificación por tipo de producto y armado de cajas familiares para distribución inmediata.',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=600&fit=crop',
      category: 'Alimentación', location: 'Galpón Central, Av. Circunvalación, Córdoba',
      duration: '1 día (7hs a 15hs)', type: 'fugaz', status: 'active',
      volunteers_needed: 60, current_volunteers: 34,
      funding_goal: 5000, current_funding: 4200, cost_per_person: 0,
      roles_needed: JSON.stringify(['Clasificador', 'Conductor (con vehículo)', 'Operador de báscula']),
      requirements: JSON.stringify(['Fuerza física para carga', 'Puntualidad', 'Ropa cómoda']),
    },
    {
      id: 'proj-4', ngo_id: 'ngo-4',
      title: 'Hackatón Social: Apps para el Bien',
      description: 'Fin de semana de desarrollo para crear soluciones tecnológicas a problemáticas sociales reales de Córdoba.',
      full_description: 'Un hackatón de 48hs donde equipos multidisciplinarios desarrollan prototipos de aplicaciones orientadas a resolver problemas concretos: conectar comedores con donantes, gestionar turnos médicos en barrios, crear plataformas de microemprendedores. Los mejores proyectos reciben mentoría y posibilidad de financiamiento.',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop',
      category: 'Tecnología', location: 'Universidad Blas Pascal, Córdoba',
      duration: '48 horas (viernes a domingo)', type: 'fugaz', status: 'active',
      volunteers_needed: 40, current_volunteers: 28,
      funding_goal: 20000, current_funding: 14000, cost_per_person: 0,
      roles_needed: JSON.stringify(['Desarrollador web', 'Diseñador UX', 'Analista de datos', 'Mentor']),
      requirements: JSON.stringify(['Laptop propia', 'Conocimientos de programación (básico para algunos roles)', 'Disponibilidad completa el fin de semana']),
    },
    {
      id: 'proj-5', ngo_id: 'ngo-1',
      title: 'Censo de Árboles Urbanos',
      description: 'Relevamiento y mapeo de la situación de los árboles en el microcentro de Córdoba.',
      full_description: 'Necesitamos voluntarios para recorrer sectores asignados del microcentro y registrar en una app el estado de cada árbol urbano: especie, altura estimada, estado fitosanitario, daños en la vereda y necesidad de poda. Los datos alimentarán el primer mapa forestal digital de Córdoba.',
      image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop',
      category: 'Medio Ambiente', location: 'Microcentro, Córdoba',
      duration: '1 día (4 horas)', type: 'fugaz', status: 'active',
      volunteers_needed: 30, current_volunteers: 12,
      funding_goal: 3000, current_funding: 1800, cost_per_person: 0,
      roles_needed: JSON.stringify(['Relevador urbano', 'Fotógrafo', 'Operador de app móvil']),
      requirements: JSON.stringify(['Smartphone con batería cargada', 'Calzado cómodo', 'Capacitación previa de 1 hora (online)']),
    },
    {
      id: 'proj-6', ngo_id: 'ngo-3',
      title: 'Cocina Comunitaria de Navidad',
      description: 'Preparamos y entregamos 500 porciones de comida caliente para familias en situación de vulnerabilidad durante las fiestas.',
      full_description: 'El 24 de diciembre organizamos una jornada de cocina masiva en el comedor comunitario del Banco de Alimentos. Se necesitan voluntarios para preparación de alimentos, cocción, emplatado y reparto en puntos fijos del sur de Córdoba. Una experiencia muy emotiva y significativa.',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
      category: 'Alimentación', location: 'Comedor Central, Barrio Müller, Córdoba',
      duration: '1 día (8hs a 20hs)', type: 'fugaz', status: 'active',
      volunteers_needed: 35, current_volunteers: 20,
      funding_goal: 18000, current_funding: 9500, cost_per_person: 0,
      roles_needed: JSON.stringify(['Cocinero', 'Ayudante de cocina', 'Repartidor', 'Coordinador de puntos']),
      requirements: JSON.stringify(['Carnet de manipulación de alimentos (o cursarlo antes)', 'Disponibilidad 24 de diciembre', 'Buena predisposición']),
    },

    // ── Sostenidos ────────────────────────────────────────────────────────────
    {
      id: 'proj-7', ngo_id: 'ngo-1',
      title: 'Huerta Comunitaria Barrio Güemes',
      description: 'Construcción y mantenimiento de una huerta orgánica que provea alimentos frescos al barrio.',
      full_description: 'El proyecto crea una huerta comunitaria de 200m² en el barrio Güemes. Los voluntarios aprenderán sobre agroecología urbana, preparación de suelos, siembra de estación, compostaje y riego eficiente. Los alimentos producidos se distribuyen entre familias del barrio y el excedente al comedor local.',
      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop',
      category: 'Alimentación', location: 'Barrio Güemes, Córdoba',
      type: 'sostenido', status: 'active',
      volunteers_needed: 20, current_volunteers: 8,
      funding_goal: 25000, current_funding: 12000, cost_per_person: 0,
      hours_per_week: 4,
      roles_needed: JSON.stringify(['Agrónomo', 'Educador ambiental', 'Voluntario general']),
      requirements: JSON.stringify(['Compromiso semanal de al menos 3 meses', 'Ganas de aprender', 'Disponibilidad los sábados a la mañana']),
    },
    {
      id: 'proj-8', ngo_id: 'ngo-2',
      title: 'Reciclaje Educativo en Escuelas',
      description: 'Talleres mensuales de educación ambiental y reciclaje en escuelas primarias de Córdoba.',
      full_description: 'Visitamos escuelas primarias del cordón norte y sur de la ciudad para dictar talleres participativos sobre separación en origen, economía circular y reciclaje creativo. Los voluntarios diseñan y dictan los talleres con materiales provistos. Actualmente trabajamos con 8 escuelas y queremos llegar a 20.',
      image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=600&fit=crop',
      category: 'Educación', location: 'Escuelas de Córdoba Capital',
      type: 'sostenido', status: 'active',
      volunteers_needed: 15, current_volunteers: 5,
      funding_goal: 10000, current_funding: 3000, cost_per_person: 0,
      hours_per_week: 6,
      roles_needed: JSON.stringify(['Educador ambiental', 'Diseñador gráfico', 'Coordinador pedagógico']),
      requirements: JSON.stringify(['Disponibilidad en horario escolar', 'Experiencia docente deseable', 'Compromiso mínimo 4 meses']),
    },
    {
      id: 'proj-9', ngo_id: 'ngo-4',
      title: 'Talleres de Programación para Jóvenes',
      description: 'Clases semanales de programación y robótica para adolescentes de barrios vulnerables.',
      full_description: 'Dictamos talleres gratuitos de introducción a la programación con Scratch, Python básico y armado de robots con Arduino para jóvenes de 13 a 18 años de los barrios Müller, Liceo y Bella Vista. Los voluntarios son el corazón del proyecto: diseñan las clases, las dictan y hacen seguimiento individual de los participantes.',
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop',
      category: 'Tecnología', location: 'Barrios Müller y Liceo, Córdoba',
      type: 'sostenido', status: 'active',
      volunteers_needed: 12, current_volunteers: 7,
      funding_goal: 30000, current_funding: 18000, cost_per_person: 0,
      hours_per_week: 5,
      roles_needed: JSON.stringify(['Programador', 'Docente', 'Mentor juvenil', 'Coordinador de sede']),
      requirements: JSON.stringify(['Conocimientos de programación', 'Habilidades pedagógicas o interés en desarrollarlas', 'Compromiso mínimo 6 meses', 'Disponibilidad los sábados']),
    },
    {
      id: 'proj-10', ngo_id: 'ngo-3',
      title: 'Red de Apoyo Escolar',
      description: 'Clases de apoyo gratuitas en materias clave para niños y adolescentes de comedores comunitarios.',
      full_description: 'Voluntarios universitarios brindan apoyo escolar dos veces por semana en matemáticas, lengua, ciencias e inglés a niños de primaria y adolescentes de secundaria que asisten a comedores comunitarios del sur de Córdoba. El programa incluye seguimiento de asistencia, contacto con las familias y articulación con las escuelas.',
      image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&h=600&fit=crop',
      category: 'Educación', location: 'Comedores del sur de Córdoba (Remoto disponible)',
      type: 'sostenido', status: 'active',
      volunteers_needed: 25, current_volunteers: 14,
      funding_goal: 12000, current_funding: 7800, cost_per_person: 0,
      hours_per_week: 4,
      roles_needed: JSON.stringify(['Profesor de matemáticas', 'Profesor de lengua', 'Profesor de inglés', 'Tutor general']),
      requirements: JSON.stringify(['Estar cursando o haber terminado nivel universitario', 'Paciencia y vocación docente', 'Compromiso mínimo un cuatrimestre', 'Disponibilidad martes y jueves a la tarde']),
    },
    {
      id: 'proj-11', ngo_id: 'ngo-4',
      title: 'Digitalización de ONGs',
      description: 'Acompañamos a pequeñas organizaciones sociales para que incorporen herramientas digitales en su gestión.',
      full_description: 'Muchas ONGs cordobesas gestionan donaciones, voluntarios y comunicación con herramientas obsoletas o en papel. Nuestros voluntarios realizan diagnósticos, implementan Google Workspace, sistemas de gestión de donantes, redes sociales y capacitan al equipo. Cada voluntario acompaña una ONG durante todo el proceso.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
      category: 'Tecnología', location: 'Remoto + visitas presenciales en Córdoba',
      type: 'sostenido', status: 'active',
      volunteers_needed: 10, current_volunteers: 4,
      funding_goal: 8000, current_funding: 2000, cost_per_person: 0,
      hours_per_week: 3,
      roles_needed: JSON.stringify(['Consultor tecnológico', 'Diseñador de comunicación', 'Capacitador digital']),
      requirements: JSON.stringify(['Conocimientos de herramientas digitales', 'Compromiso 4 meses', 'Capacidad de explicar temas técnicos de forma simple', 'Movilidad propia deseable']),
    },
    {
      id: 'proj-12', ngo_id: 'ngo-2',
      title: 'Monitoreo de Calidad del Aire',
      description: 'Red ciudadana de sensores para medir y mapear la calidad del aire en tiempo real en Córdoba.',
      full_description: 'Instalamos sensores de bajo costo en hogares y espacios públicos para crear el primer mapa de calidad del aire de Córdoba Capital. Los voluntarios instalan sensores, registran datos, participan en análisis mensuales y difunden los resultados en sus barrios. Los datos son públicos y se comparten con la Municipalidad.',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=600&fit=crop',
      category: 'Medio Ambiente', location: 'Toda la Ciudad de Córdoba',
      type: 'sostenido', status: 'active',
      volunteers_needed: 50, current_volunteers: 22,
      funding_goal: 40000, current_funding: 25000, cost_per_person: 0,
      hours_per_week: 2,
      roles_needed: JSON.stringify(['Monitor ciudadano', 'Analista de datos', 'Comunicador científico', 'Técnico en electrónica']),
      requirements: JSON.stringify(['Acceso a internet en el hogar', 'Tener un smartphone', 'Compromiso mínimo 6 meses', 'Curiosidad por el tema ambiental']),
    },
  ];

  for (const p of projects) {
    const exists = await db.get('SELECT id FROM projects WHERE id=$1', [p.id]);
    if (!exists) {
      await db.run(
        `INSERT INTO projects (id, ngo_id, title, description, full_description, image, category, location,
          duration, type, status, volunteers_needed, current_volunteers, funding_goal, current_funding,
          cost_per_person, hours_per_week, roles_needed, requirements)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [p.id, p.ngo_id, p.title, p.description, p.full_description, p.image, p.category, p.location,
         p.duration || null, p.type, p.status || 'active',
         p.volunteers_needed, p.current_volunteers,
         p.funding_goal, p.current_funding, p.cost_per_person,
         p.hours_per_week || null, p.roles_needed, p.requirements]
      );
    }
  }
  console.log('  ✅ Proyectos (12 en total)');

  // ── Inscripciones de muestra ──────────────────────────────────────────────
  const enrollments = [
    { user_id: 'user-vol-1', project_id: 'proj-1',  status: 'approved' },
    { user_id: 'user-vol-1', project_id: 'proj-7',  status: 'approved' },
    { user_id: 'user-vol-1', project_id: 'proj-9',  status: 'pending'  },
    { user_id: 'user-vol-2', project_id: 'proj-1',  status: 'pending'  },
    { user_id: 'user-vol-2', project_id: 'proj-3',  status: 'approved' },
    { user_id: 'user-vol-2', project_id: 'proj-8',  status: 'approved' },
    { user_id: 'user-vol-3', project_id: 'proj-4',  status: 'approved' },
    { user_id: 'user-vol-3', project_id: 'proj-10', status: 'pending'  },
  ];

  for (const e of enrollments) {
    const exists = await db.get(
      'SELECT id FROM enrollments WHERE user_id=$1 AND project_id=$2',
      [e.user_id, e.project_id]
    );
    if (!exists) {
      await db.run(
        `INSERT INTO enrollments (user_id, project_id, status) VALUES ($1,$2,$3)`,
        [e.user_id, e.project_id, e.status]
      );
    }
  }
  console.log('  ✅ Inscripciones');

  console.log('\n✅ Seed completado');
  console.log('\n📬 Usuarios de prueba:');
  console.log('  Voluntario:  maria@example.com   / Password1');
  console.log('  Voluntario:  juan@example.com    / Password1');
  console.log('  Voluntario:  lucia@example.com   / Password1');
  console.log('  ONG:         admin@sustentando.org / Password1');
  console.log('  ONG:         admin@greencba.org    / Password1');
  console.log('  ONG:         admin@bancoalimentos.org / Password1');
  console.log('  ONG:         admin@techsocial.org   / Password1');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
