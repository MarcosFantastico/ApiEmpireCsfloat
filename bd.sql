-- caso precise usar rodar define off antes da execução e reabilitar depois
set define off; -- para fazer o & não ser interpretado como variavel mutável
set define on; -- voltar dps do processo de insert

-- criação das tabelas
-- drop tables
drop table log_jobs;
commit;
drop table melhor_historico_empire;
commit;
drop table skin;
commit;
drop table arma;
commit;
-- drop sequences
DROP SEQUENCE SEQ_lj;
DROP SEQUENCE SEQ_ARMA;
DROP SEQUENCE SEQ_SKIN;
DROP SEQUENCE SEQ_MHE;
commit;
-- drop procs
drop procedure PROC_DROPA_HISTORICO;
commit;

-- drop jobs
/
BEGIN
  DBMS_SCHEDULER.DROP_JOB('COUNTERSTRIKE.dropaHistorico');
END;
/
commit;



-- Criação das sequências
CREATE SEQUENCE SEQ_lj START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_MHE START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_ARMA START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_SKIN START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
commit;

-- Criação da tabela

CREATE TABLE log_jobs (
    id_log number DEFAULT SEQ_lj.NEXTVAL primary key,
    data_execucao TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    mensagem VARCHAR2(4000) NOT NULL);

CREATE TABLE arma (
    id NUMBER DEFAULT SEQ_ARMA.NEXTVAL PRIMARY KEY,
    nome VARCHAR2(100) UNIQUE
);
commit;

CREATE TABLE skin (
    id NUMBER  DEFAULT SEQ_SKIN.NEXTVAL PRIMARY KEY,
    nome VARCHAR2(100),
    arma_id NUMBER NOT NULL,
    CONSTRAINT fk_skin_arma FOREIGN KEY (arma_id) REFERENCES arma(id)
);
commit;

CREATE TABLE melhor_historico_empire (
    id NUMBER DEFAULT SEQ_MHE.NEXTVAL PRIMARY KEY,
    preco NUMBER(10,2) NOT NULL,
    skin_float BINARY_FLOAT,
    skin_id NUMBER NOT NULL,
    arma_id NUMBER NOT NULL,
    qualidade VARCHAR2(100),
    data_registro TIMESTAMP DEFAULT SYSDATE,
    cb NUMBER(10,4),
    CONSTRAINT fk_mhe_skin FOREIGN KEY (skin_id) REFERENCES skin(id),
    CONSTRAINT fk_mhe_arma FOREIGN KEY (arma_id) REFERENCES arma(id)
);



COMMIT;

-- Comentários para documentação
COMMENT ON TABLE melhor_historico_empire IS 'Tabela para armazenar o melhor histórico de preços do Empire';
COMMENT ON COLUMN melhor_historico_empire.id IS 'PK autoincremental';
COMMENT ON COLUMN melhor_historico_empire.preco IS 'Preço do item (até 2 casas decimais)';
COMMENT ON COLUMN melhor_historico_empire.skin_float IS 'Valor float da skin';
COMMENT ON COLUMN melhor_historico_empire.skin_id IS 'FK para a tabela skin';
COMMENT ON COLUMN melhor_historico_empire.data_registro IS 'Data/hora do registro';


INSERT INTO arma (nome) VALUES ('AK-47');
INSERT INTO arma (nome) VALUES ('M4A4');
INSERT INTO arma (nome) VALUES ('M4A1-S');
INSERT INTO arma (nome) VALUES ('AWP');
INSERT INTO arma (nome) VALUES ('AUG');
INSERT INTO arma (nome) VALUES ('SG 553');
INSERT INTO arma (nome) VALUES ('SSG 08');
INSERT INTO arma (nome) VALUES ('FAMAS');
INSERT INTO arma (nome) VALUES ('Galil AR');
INSERT INTO arma (nome) VALUES ('P90');
INSERT INTO arma (nome) VALUES ('MP9');
INSERT INTO arma (nome) VALUES ('MP7');
INSERT INTO arma (nome) VALUES ('MP5-SD');
INSERT INTO arma (nome) VALUES ('MAC-10');
INSERT INTO arma (nome) VALUES ('UMP-45');
INSERT INTO arma (nome) VALUES ('PP-Bizon');
INSERT INTO arma (nome) VALUES ('Glock-18');
INSERT INTO arma (nome) VALUES ('USP-S');
INSERT INTO arma (nome) VALUES ('P2000');
INSERT INTO arma (nome) VALUES ('Desert Eagle');
INSERT INTO arma (nome) VALUES ('R8 Revolver');
INSERT INTO arma (nome) VALUES ('Five-SeveN');
INSERT INTO arma (nome) VALUES ('Tec-9');
INSERT INTO arma (nome) VALUES ('P250');
INSERT INTO arma (nome) VALUES ('CZ75-Auto');
INSERT INTO arma (nome) VALUES ('M249');
INSERT INTO arma (nome) VALUES ('Nova');
INSERT INTO arma (nome) VALUES ('XM1014');
INSERT INTO arma (nome) VALUES ('MAG-7');
INSERT INTO arma (nome) VALUES ('Sawed-Off');

-- stat tracks
INSERT INTO arma (nome) VALUES ('StatTrak™ AK-47');
INSERT INTO arma (nome) VALUES ('StatTrak™ M4A4');
INSERT INTO arma (nome) VALUES ('StatTrak™ M4A1-S');
INSERT INTO arma (nome) VALUES ('StatTrak™ AWP');
INSERT INTO arma (nome) VALUES ('StatTrak™ AUG');
INSERT INTO arma (nome) VALUES ('StatTrak™ SG 553');
INSERT INTO arma (nome) VALUES ('StatTrak™ SSG 08');
INSERT INTO arma (nome) VALUES ('StatTrak™ FAMAS');
INSERT INTO arma (nome) VALUES ('StatTrak™ Galil AR');
INSERT INTO arma (nome) VALUES ('StatTrak™ P90');
INSERT INTO arma (nome) VALUES ('StatTrak™ MP9');
INSERT INTO arma (nome) VALUES ('StatTrak™ MP7');
INSERT INTO arma (nome) VALUES ('StatTrak™ MP5-SD');
INSERT INTO arma (nome) VALUES ('StatTrak™ MAC-10');
INSERT INTO arma (nome) VALUES ('StatTrak™ UMP-45');
INSERT INTO arma (nome) VALUES ('StatTrak™ PP-Bizon');
INSERT INTO arma (nome) VALUES ('StatTrak™ Glock-18');
INSERT INTO arma (nome) VALUES ('StatTrak™ USP-S');
INSERT INTO arma (nome) VALUES ('StatTrak™ P2000');
INSERT INTO arma (nome) VALUES ('StatTrak™ Desert Eagle');
INSERT INTO arma (nome) VALUES ('StatTrak™ R8 Revolver');
INSERT INTO arma (nome) VALUES ('StatTrak™ Five-SeveN');
INSERT INTO arma (nome) VALUES ('StatTrak™ Tec-9');
INSERT INTO arma (nome) VALUES ('StatTrak™ P250');
INSERT INTO arma (nome) VALUES ('StatTrak™ CZ75-Auto');
INSERT INTO arma (nome) VALUES ('StatTrak™ M249');
INSERT INTO arma (nome) VALUES ('StatTrak™ Nova');
INSERT INTO arma (nome) VALUES ('StatTrak™ XM1014');
INSERT INTO arma (nome) VALUES ('StatTrak™ MAG-7');
INSERT INTO arma (nome) VALUES ('StatTrak™ Sawed-Off');

-- facas
INSERT INTO arma (nome) VALUES ('★ Shadow Daggers');--61
INSERT INTO arma (nome) VALUES ('★ Ursus Knife'); --62
INSERT INTO arma (nome) VALUES ('★ Bowie Knife'); --63
--luvas
INSERT INTO arma (nome) VALUES ('Moto Gloves');

-- agente
INSERT INTO arma (nome) VALUES ('Vypa Sista of the Revolution'); -- 65
INSERT INTO arma (nome) VALUES ('Special Agent Ava'); --66
INSERT INTO arma (nome) VALUES ('Osiris'); --67

--
INSERT INTO arma (nome) VALUES ('★ Survival Knife'); --68
INSERT INTO arma (nome) VALUES ('★ Huntsman Knife');--69
INSERT INTO arma (nome) VALUES ('★ Kukri Knife');--70
INSERT INTO arma (nome) VALUES ('Blackwolf');--71
INSERT INTO arma (nome) VALUES ('★ Hand Wraps');--72


-- itens unitarios Obs inserir antes dessa linha para id incremental sequencial ,e evitar bugs de referencia errada ao adicionar um skin para a arma



commit;
-- Fim insert tabela arma

-- Tabela SKIN com associações oficiais

COMMIT;
-- Inserts individuais
-- select * from arma;
-- select * from skin;
-- famas FAMAS | Macabre
--mp9
 INSERT INTO skin (nome, arma_id) VALUES ('Mount Fuji',11); --MP9 | Mount Fuji
 INSERT INTO skin (nome, arma_id) VALUES ('Mount Fuji',41); --MP9 | Mount Fuji

INSERT INTO skin (nome, arma_id) VALUES ('Macabre',8); -- famas

-- ump 45
INSERT INTO skin (nome, arma_id) VALUES ('Metal Flowers',15); -- UMP-45 | Metal Flowers
INSERT INTO skin (nome, arma_id) VALUES ('Metal Flowers',45); -- UMP-45 | Metal Flowers

-- mac 10
--MAC-10 | Aloha
INSERT INTO skin (nome, arma_id) VALUES ('Aloha',14);
INSERT INTO skin (nome, arma_id) VALUES ('Toybox',14); --MAC-10 | Toybox

-- skins para agentes

insert into skin(nome,arma_id) values('Sabre', 71);
insert into skin(nome,arma_id) values('Elite Crew', 67);
insert into skin(nome,arma_id) values('FBI', 66);
insert into skin(nome,arma_id) values('Guerrilla Warfare', 65);

-- skins para luvas

--INSERT INTO skin (nome, arma_id) VALUES ('Transport',64);
--INSERT INTO skin (nome, arma_id) VALUES ('Turtle',64);
--INSERT INTO skin (nome, arma_id) VALUES ('Arboreal',72);
--INSERT INTO skin (nome, arma_id) VALUES ('Giraffe',72);


-- skins para facas
-- ★ Ursus Knife | Marble Fade
--INSERT INTO skin (nome, arma_id) VALUES ('Vanilla',70);
--INSERT INTO skin (nome, arma_id) VALUES ('Blue Steel',70);

--INSERT INTO skin (nome, arma_id) VALUES ('Slaughter',70);
--INSERT INTO skin (nome, arma_id) VALUES ('Slaughter',69);
--INSERT INTO skin (nome, arma_id) VALUES ('Slaughter',68);
--INSERT INTO skin (nome, arma_id) VALUES ('Slaughter',63);
--INSERT INTO skin (nome, arma_id) VALUES ('Slaughter',62);
--INSERT INTO skin (nome, arma_id) VALUES ('Slaughter',61);

--INSERT INTO skin (nome, arma_id) VALUES ('Marble Fade',62);

--INSERT INTO skin (nome, arma_id) VALUES ('Tiger Tooth',61);
--INSERT INTO skin (nome, arma_id) VALUES ('Tiger Tooth',62);
--INSERT INTO skin (nome, arma_id) VALUES ('Tiger Tooth',63);
--INSERT INTO skin (nome, arma_id) VALUES ('Tiger Tooth',68);
--INSERT INTO skin (nome, arma_id) VALUES ('Tiger Tooth',69);


--INSERT INTO skin (nome, arma_id) VALUES ('Lore',61);
--INSERT INTO skin (nome, arma_id) VALUES ('Lore',63);
--INSERT INTO skin (nome, arma_id) VALUES ('Lore',69);

-- Skins para Rifles
INSERT INTO skin (nome, arma_id) VALUES ('Atheris', 4);            -- AWP ??
INSERT INTO skin (nome, arma_id) VALUES ('Asiimov', 1);            -- AK-47 ??
INSERT INTO skin (nome, arma_id) VALUES ('Asiimov', 2);            -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Asiimov', 4);            -- AWP ??
INSERT INTO skin (nome, arma_id) VALUES ('Spider Lily', 2);        -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Cortex', 18);            -- USP-S ??
INSERT INTO skin (nome, arma_id) VALUES ('Blueprint', 18);            -- USP-S ?? USP-S | Blueprint
INSERT INTO skin (nome, arma_id) VALUES ('The Traitor', 18);     
INSERT INTO skin (nome, arma_id) VALUES ('Jawbreaker', 18);    

INSERT INTO skin (nome, arma_id) VALUES ('Atomic Alloy', 3);       -- M4A1-S ?? M4A1-S | Briefing
INSERT INTO skin (nome, arma_id) VALUES ('Briefing', 3); 
INSERT INTO skin (nome, arma_id) VALUES ('Black Lotus', 3);        -- M4A1-S ??
INSERT INTO skin (nome, arma_id) VALUES ('Tooth Fairy', 2);        -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Buzz Kill', 2);          -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Cyber Security', 2);     -- SG 553 ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('Desolate Space', 2);     -- M4A4 ?? (corrigido)

-- Skins para Snipers
INSERT INTO skin (nome, arma_id) VALUES ('Bloodshot', 7);          -- SSG 08 ??
INSERT INTO skin (nome, arma_id) VALUES ('Death''s Head', 7);          -- SSG 08 ?? SSG 08 | Death's Head
INSERT INTO skin (nome, arma_id) VALUES ('Turbo Peek', 7); -- SSG 08 | Turbo Peek
INSERT INTO skin (nome, arma_id) VALUES ('Duality', 4);           -- P250 ??
INSERT INTO skin (nome, arma_id) VALUES ('Dragonfire', 7);         -- SSG 08 ??
INSERT INTO skin (nome, arma_id) VALUES ('Fever Dream', 7);        -- SSG 08 ??

-- Skins para Pistolas

INSERT INTO skin (nome, arma_id) VALUES ('Gold Toof', 17);  -- Glock-18 ??
INSERT INTO skin (nome, arma_id) VALUES ('Fairy Tale', 22);       -- Five-SeveN ??
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 17);         -- Glock-18 ??
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 18);     -- USP-S ??
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 4);    -- awp
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 2);    -- a4
--select * from arma;

-- Skins Especiais
INSERT INTO skin (nome, arma_id) VALUES ('Dragon King', 2);       -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Hyper Beast', 3);       -- M4A1-S ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('In Living Color', 2);   -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('The Empress', 1);       -- AK-47 ??
INSERT INTO skin (nome, arma_id) VALUES ('Crimson Tsunami', 9);   -- Galil AR ??
INSERT INTO skin (nome, arma_id) VALUES ('Misty', 1);             -- AK-47 ??

-- Skins de Coleções
INSERT INTO skin (nome, arma_id) VALUES ('Decimator', 3);         -- M4A1-S ??
INSERT INTO skin (nome, arma_id) VALUES ('Monster Mashup', 18);   -- USP-S ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('Neon Rider', 1);        -- AK-47 ??
INSERT INTO skin (nome, arma_id) VALUES ('Player Two', 3);        -- M4A1-S ??
--INSERT INTO skin (nome, arma_id) VALUES ('Paw', 4);               -- AWP ??
INSERT INTO skin (nome, arma_id) VALUES ('Nightmare', 3);         -- M4A1-S ?? (corrigido)
--INSERT INTO skin (nome, arma_id) VALUES ('Nightwish', 1);         -- AWP ??

INSERT INTO skin (nome, arma_id) VALUES ('Temukau', 2);           -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 3);       -- M4A1-S ??
INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 20);      -- Desert Eagle ??
INSERT INTO skin (nome, arma_id) VALUES ('Conspiracy', 20);      -- Desert Eagle ??
INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 18);         -- USP-S ??
INSERT INTO skin (nome, arma_id) VALUES ('Redline', 1);           -- AK-47 ??
INSERT INTO skin (nome, arma_id) VALUES ('Sun in Leo', 4);        -- AWP ??

INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 4);        -- AWP ??
INSERT INTO skin (nome, arma_id) VALUES ('Hyper Beast', 4);
INSERT INTO skin (nome, arma_id) VALUES ('BOOM', 4);
INSERT INTO skin (nome, arma_id) VALUES ('Crakow!', 4);



INSERT INTO skin (nome, arma_id) VALUES ('Whiteout', 18);         -- USP-S
-- Skins de Operações
--M4A4 | The The Emperor
INSERT INTO skin (nome, arma_id) VALUES ('The Emperor', 2);          
INSERT INTO skin (nome, arma_id) VALUES ('Outsiders', 1);         -- AK-47 AK-47 | Orbit Mk01
INSERT INTO skin (nome, arma_id) VALUES ('Orbit Mk01', 1);
--INSERT INTO skin (nome, arma_id) VALUES ('Legion of Anubis', 1);   -- AK-47
--INSERT INTO skin (nome, arma_id) VALUES ('Worm God', 4);           -- AWP ?? (corrigido)
--INSERT INTO skin (nome, arma_id) VALUES ('Heat Treated', 20);      -- Desert Eagle ??
INSERT INTO skin (nome, arma_id) VALUES ('Visions', 24);          -- P250 ??
INSERT INTO skin (nome, arma_id) VALUES ('Wildfire', 4);          -- AWP ??

-- Skins Diversas
INSERT INTO skin (nome, arma_id) VALUES ('Monster Melt', 28);     -- XM1014 ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('Eye of Zapems', 5);     -- AUG ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('Head Shot', 1);         -- AK-47 ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('Leaded Glass', 3);      -- M4A1-S ??
INSERT INTO skin (nome, arma_id) VALUES ('Global Offensive', 2);  -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Water Elemental', 17);  -- Glock-18 ??
INSERT INTO skin (nome, arma_id) VALUES ('Cyrex', 18);            -- USP-S ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('Cyrex', 3);   
INSERT INTO skin (nome, arma_id) VALUES ('Vogue', 17);            -- Glock-18 ?? (corrigido)
INSERT INTO skin (nome, arma_id) VALUES ('The Coalition', 2);     -- M4A4 ??
INSERT INTO skin (nome, arma_id) VALUES ('Integrale', 6);         -- SG 553 ?? (corrigido)
--INSERT INTO skin (nome, arma_id) VALUES ('Carved Jade', 5);       -- AUG ?? (corrigido);

-- stat tracks

-- Skins associadas às armas StatTrak™ (arma_id + 30)


INSERT INTO skin (nome, arma_id) VALUES ('Macabre',38); -- famas
INSERT INTO skin (nome, arma_id) VALUES ('Aloha',44);
INSERT INTO skin (nome, arma_id) VALUES ('Toybox',44); --MAC-10 | Toybox

INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 48);  
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 34);    -- awp
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 32); -- a4

INSERT INTO skin (nome, arma_id) VALUES ('Atheris', 34);            
INSERT INTO skin (nome, arma_id) VALUES ('Asiimov', 31);            
INSERT INTO skin (nome, arma_id) VALUES ('Asiimov', 32);            
INSERT INTO skin (nome, arma_id) VALUES ('Asiimov', 34);            
INSERT INTO skin (nome, arma_id) VALUES ('Spider Lily', 32);        
INSERT INTO skin (nome, arma_id) VALUES ('Cortex', 48);     -- Blueprint    
INSERT INTO skin (nome, arma_id) VALUES ('Blueprint', 48);
INSERT INTO skin (nome, arma_id) VALUES ('The Traitor', 48);     
INSERT INTO skin (nome, arma_id) VALUES ('Jawbreaker', 48);    

INSERT INTO skin (nome, arma_id) VALUES ('Atomic Alloy', 33);     -- Briefing  
INSERT INTO skin (nome, arma_id) VALUES ('Briefing', 33); 
INSERT INTO skin (nome, arma_id) VALUES ('Black Lotus', 33);        
INSERT INTO skin (nome, arma_id) VALUES ('Tooth Fairy', 32);        
INSERT INTO skin (nome, arma_id) VALUES ('Buzz Kill', 32);          
INSERT INTO skin (nome, arma_id) VALUES ('Cyber Security', 36);     
INSERT INTO skin (nome, arma_id) VALUES ('Desolate Space', 32);     

-- Skins para Snipers
INSERT INTO skin (nome, arma_id) VALUES ('Bloodshot', 37);    
INSERT INTO skin (nome, arma_id) VALUES ('Death''s Head', 37);
INSERT INTO skin (nome, arma_id) VALUES ('Turbo Peek', 37);
INSERT INTO skin (nome, arma_id) VALUES ('Duality', 54);           
INSERT INTO skin (nome, arma_id) VALUES ('Dragonfire', 37);         
INSERT INTO skin (nome, arma_id) VALUES ('Fever Dream', 37);        

-- Skins para Pistolas
INSERT INTO skin (nome, arma_id) VALUES ('Fairy Tale', 52);       
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 47);         
INSERT INTO skin (nome, arma_id) VALUES ('Neo-Noir', 48);         

-- Skins Especiais
INSERT INTO skin (nome, arma_id) VALUES ('Dragon King', 32);       
INSERT INTO skin (nome, arma_id) VALUES ('Hyper Beast', 33);       
INSERT INTO skin (nome, arma_id) VALUES ('In Living Color', 32);   
INSERT INTO skin (nome, arma_id) VALUES ('The Empress', 31);       
INSERT INTO skin (nome, arma_id) VALUES ('Crimson Tsunami', 39);   
INSERT INTO skin (nome, arma_id) VALUES ('Misty', 31);             

-- Skins de Coleções
INSERT INTO skin (nome, arma_id) VALUES ('Decimator', 33);         
INSERT INTO skin (nome, arma_id) VALUES ('Monster Mashup', 48);   
INSERT INTO skin (nome, arma_id) VALUES ('Neon Rider', 31);        
INSERT INTO skin (nome, arma_id) VALUES ('Player Two', 33);        
--INSERT INTO skin (nome, arma_id) VALUES ('Paw', 34);               
INSERT INTO skin (nome, arma_id) VALUES ('Nightmare', 33);         
--INSERT INTO skin (nome, arma_id) VALUES ('Nightwish', 31);         

-- Skins Modernas
INSERT INTO skin (nome, arma_id) VALUES ('Temukau', 32);           
INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 33);       
INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 50);       
INSERT INTO skin (nome, arma_id) VALUES ('Conspiracy', 50);      -- Desert Eagle ??
INSERT INTO skin (nome, arma_id) VALUES ('Redline', 31);           
INSERT INTO skin (nome, arma_id) VALUES ('Sun in Leo', 34);    
INSERT INTO skin (nome, arma_id) VALUES ('Printstream', 34);        -- AWP ??
INSERT INTO skin (nome, arma_id) VALUES ('Hyper Beast', 34);
INSERT INTO skin (nome, arma_id) VALUES ('BOOM', 34);
INSERT INTO skin (nome, arma_id) VALUES ('Crakow!', 34);

INSERT INTO skin (nome, arma_id) VALUES ('Whiteout', 48);          

-- Skins de Operações
INSERT INTO skin (nome, arma_id) VALUES ('The Emperor', 32);           
INSERT INTO skin (nome, arma_id) VALUES ('Outsiders', 31);        
INSERT INTO skin (nome, arma_id) VALUES ('Orbit Mk01', 31);
--INSERT INTO skin (nome, arma_id) VALUES ('Legion of Anubis', 31);  
--INSERT INTO skin (nome, arma_id) VALUES ('Worm God', 34);          
--INSERT INTO skin (nome, arma_id) VALUES ('Heat Treated', 50);     
INSERT INTO skin (nome, arma_id) VALUES ('Visions', 54);          
INSERT INTO skin (nome, arma_id) VALUES ('Wildfire', 34);          

-- Skins Diversas
INSERT INTO skin (nome, arma_id) VALUES ('Monster Melt', 58);     
INSERT INTO skin (nome, arma_id) VALUES ('Eye of Zapems', 35);     
INSERT INTO skin (nome, arma_id) VALUES ('Head Shot', 31);         
INSERT INTO skin (nome, arma_id) VALUES ('Leaded Glass', 33);      
INSERT INTO skin (nome, arma_id) VALUES ('Global Offensive', 32);  
INSERT INTO skin (nome, arma_id) VALUES ('Water Elemental', 47);  
INSERT INTO skin (nome, arma_id) VALUES ('Cyrex', 48); 
INSERT INTO skin (nome, arma_id) VALUES ('Cyrex', 33); 
INSERT INTO skin (nome, arma_id) VALUES ('Vogue', 47);            
INSERT INTO skin (nome, arma_id) VALUES ('The Coalition', 32);     
INSERT INTO skin (nome, arma_id) VALUES ('Integrale', 36);         
--INSERT INTO skin (nome, arma_id) VALUES ('Carved Jade', 35);       
COMMIT;

-- Fim insert tabela skin
-- ------Fim criação banco---------------------------------------------------------------
-- criação de triggers

-- fim criacao de triggers

-- criação das procs
/
CREATE OR REPLACE PROCEDURE COUNTERSTRIKE.PROC_DROPA_HISTORICO AS
BEGIN

  INSERT INTO log_jobs VALUES(SEQ_lj.nextval,SYSDATE, 'Job executado');
  EXECUTE IMMEDIATE 'TRUNCATE TABLE melhor_historico_empire';
END;
/
commit;


-- criação de jobs:

/
BEGIN
  DBMS_SCHEDULER.CREATE_JOB (
    job_name        => 'COUNTERSTRIKE.dropaHistorico',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN COUNTERSTRIKE.PROC_DROPA_HISTORICO; END;',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=DAILY; BYHOUR=0; BYMINUTE=0; BYSECOND=0',
    enabled         => TRUE,
    comments        => 'Job para truncar a tabela de histórico a cada minuto.');
END;
/
commit;
-- fim criação de jobs
-- fim de tudo

select * from arma;

-- queries
-- armas
SELECT a.nome || ' | ' || s.nome AS "Arma | Skin" FROM arma a INNER JOIN  skin s ON a.id = s.arma_id ORDER BY a.nome ASC, s.nome ASC;


-- select Historico
select 
  mhe.id, 
  mhe.preco,
  mhe.skin_float,
  ar.nome || ' | ' || sk.nome as nome_completo,
  mhe.qualidade,
  mhe.data_registro,
  round(mhe.cb,2)
from 
melhor_historico_empire mhe 
join skin sk on sk.id = mhe.skin_id 
join arma ar on ar.id = mhe.arma_id
;
commit;

select * from v$session;

-- nome | skin
SELECT a.nome || ' | ' || s.nome AS "Arma | Skin"
      FROM arma a
      INNER JOIN skin s ON a.id = s.arma_id
      ORDER BY a.nome ASC, s.nome ASC;


select * from log_jobs;

truncate table melhor_historico_empire;
commit;



